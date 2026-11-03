import type { ApplicationStatus } from "@/features/applications/schemas/status"
import { decisionInputSchema } from "../schemas/workflow"
import type { Decision, DecisionInput, WorkflowDefinition, WorkflowState } from "../types"
import { canAct, type EngineActor, type EngineApplication, type EngineDelegation } from "./authority"
import { WorkflowEngineError } from "./errors"
import { assertTransition } from "./lifecycle"
import { isValidReason } from "./reasons"
import { getStage, nextStageInDefinition, resolveRoute } from "./route"
import { evaluateEscalation } from "./sla"

export type DecisionOutcome =
  "advanced" | "awaiting_parallel" | "approved" | "rejected" | "returned" | "info_requested" | "escalated"

export interface TransitionResult {
  status: ApplicationStatus
  workflow: WorkflowState
  outcome: DecisionOutcome
  decision: Decision | null
}

/** Builds the initial workflow state when an application enters approval. */
export function startApproval(definition: WorkflowDefinition, amount: number, now: Date): WorkflowState {
  const route = resolveRoute(definition, amount)
  return {
    definitionId: definition.id,
    definitionVersion: definition.version,
    route: route.stages.map((s) => s.key),
    currentStageKey: route.stages[0].key,
    stageEnteredAt: now.toISOString(),
    stageApprovals: [],
    stageVotes: [],
    decisions: [],
  }
}

function moveTo(wf: WorkflowState, stageKey: string | null, now: Date): WorkflowState {
  return {
    ...wf,
    currentStageKey: stageKey,
    stageEnteredAt: stageKey ? now.toISOString() : null,
    stageApprovals: [],
    stageVotes: [],
  }
}

/** Adds `stageKey` to the route (keeping definition order) if it is not already on it. */
function extendRoute(definition: WorkflowDefinition, route: string[], stageKey: string): string[] {
  if (route.includes(stageKey)) return route
  const keep = new Set([...route, stageKey])
  return definition.stages.map((s) => s.key).filter((k) => keep.has(k))
}

export interface ApplyDecisionInput {
  application: EngineApplication
  definition: WorkflowDefinition
  actor: EngineActor
  delegations: readonly EngineDelegation[]
  input: DecisionInput
  decisionId: string
  now: Date
}

/**
 * Applies a human decision. Re-checks authority, so a stale UI can never
 * push through a decision the engine would not allow.
 */
export function applyDecision({
  application,
  definition,
  actor,
  delegations,
  input,
  decisionId,
  now,
}: ApplyDecisionInput): TransitionResult {
  const parsed = decisionInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new WorkflowEngineError("invalid_decision", parsed.error.issues[0]?.message ?? "Invalid decision")
  }
  if (!isValidReason(input.action, input.reasonCode)) {
    throw new WorkflowEngineError("invalid_decision", `"${input.reasonCode}" is not a valid reason for ${input.action}`)
  }

  const evaluation = canAct({ application, definition, actor, delegations, now })
  if (!evaluation.allowed) throw new WorkflowEngineError("not_allowed", evaluation.message)
  if (!evaluation.allowedActions.includes(input.action)) {
    throw new WorkflowEngineError("not_allowed", `${input.action} is not available at this stage`)
  }

  const wf = application.workflow as WorkflowState
  const stage = getStage(definition, wf.currentStageKey as string)

  const decision: Decision = {
    id: decisionId,
    stageKey: stage.key,
    action: input.action,
    reasonCode: input.reasonCode,
    comment: parsed.data.comment,
    actorId: actor.id,
    actorRole: evaluation.actingRole,
    onBehalfOfId: evaluation.onBehalfOf?.userId ?? null,
    automated: false,
    at: now.toISOString(),
  }
  const withDecision: WorkflowState = { ...wf, decisions: [...wf.decisions, decision] }

  const finish = (status: ApplicationStatus, workflow: WorkflowState, outcome: DecisionOutcome): TransitionResult => {
    assertTransition(application.status, status)
    return { status, workflow, outcome, decision }
  }

  // Committee: approve and reject are votes; the stage only closes once the outcome is decided.
  if (stage.committee && (input.action === "approve" || input.action === "reject")) {
    const voter = evaluation.onBehalfOf?.userId ?? actor.id
    const votes = [
      ...wf.stageVotes,
      {
        userId: voter,
        vote: input.action === "approve" ? ("approve" as const) : ("decline" as const),
        at: decision.at,
      },
    ]
    const approvals = votes.filter((v) => v.vote === "approve").length
    const declines = votes.length - approvals
    const { memberIds, votesRequired } = stage.committee
    if (input.action === "reject") {
      // Declined once approval can no longer reach the required votes.
      if (declines > memberIds.length - votesRequired) {
        return finish(
          "rejected",
          { ...withDecision, stageVotes: votes, stageEnteredAt: null, stageApprovals: [] },
          "rejected",
        )
      }
      return finish("pending_approval", { ...withDecision, stageVotes: votes }, "awaiting_parallel")
    }
    if (approvals < votesRequired)
      return finish("pending_approval", { ...withDecision, stageVotes: votes }, "awaiting_parallel")
    const next = wf.route[wf.route.indexOf(stage.key) + 1]
    if (!next) return finish("approved", { ...moveTo(withDecision, null, now), stageVotes: votes }, "approved")
    return finish("pending_approval", moveTo(withDecision, next, now), "advanced")
  }

  switch (input.action) {
    case "approve": {
      if (stage.approverRoles.length > 1 && stage.quorum === "all") {
        const approvals = [...wf.stageApprovals, { role: evaluation.actingRole, userId: actor.id, at: decision.at }]
        const outstanding = stage.approverRoles.filter((r) => !approvals.some((a) => a.role === r))
        if (outstanding.length > 0) {
          return finish("pending_approval", { ...withDecision, stageApprovals: approvals }, "awaiting_parallel")
        }
      }
      const index = wf.route.indexOf(stage.key)
      const next = wf.route[index + 1]
      if (!next) return finish("approved", moveTo(withDecision, null, now), "approved")
      return finish("pending_approval", moveTo(withDecision, next, now), "advanced")
    }
    case "reject":
      return finish("rejected", { ...withDecision, stageEnteredAt: null, stageApprovals: [] }, "rejected")
    case "return":
      return finish("returned", { ...withDecision, stageApprovals: [] }, "returned")
    case "request_info":
      return finish("more_info_requested", { ...withDecision, stageApprovals: [] }, "info_requested")
    case "escalate": {
      const target = nextStageInDefinition(definition, stage.key)
      if (!target) throw new WorkflowEngineError("not_allowed", "There is no higher stage to escalate to")
      const escalated = { ...withDecision, route: extendRoute(definition, wf.route, target.key) }
      return finish("pending_approval", moveTo(escalated, target.key, now), "escalated")
    }
  }
}

/** Sends a returned / more-info application back to the stage that sent it. */
export function resubmit(application: EngineApplication, now: Date): Omit<TransitionResult, "decision"> {
  const wf = application.workflow
  if (!wf?.currentStageKey || (application.status !== "returned" && application.status !== "more_info_requested")) {
    throw new WorkflowEngineError("invalid_transition", "Only returned applications can be resubmitted")
  }
  assertTransition(application.status, "pending_approval")
  return { status: "pending_approval", workflow: moveTo(wf, wf.currentStageKey, now), outcome: "advanced" }
}

/**
 * Run by the SLA scheduler. Escalates when the stage's auto-escalation
 * threshold is passed; returns null when nothing should happen.
 */
export function autoEscalate(
  application: EngineApplication,
  definition: WorkflowDefinition,
  decisionId: string,
  now: Date,
): TransitionResult | null {
  const wf = application.workflow
  if (application.status !== "pending_approval" || !wf?.currentStageKey || !wf.stageEnteredAt) return null
  const stage = getStage(definition, wf.currentStageKey)
  if (evaluateEscalation(stage, new Date(wf.stageEnteredAt), now) !== "escalate") return null
  const target = nextStageInDefinition(definition, stage.key)
  if (!target) return null

  const decision: Decision = {
    id: decisionId,
    stageKey: stage.key,
    action: "escalate",
    reasonCode: "sla_breach",
    comment: `Automatically escalated to ${target.name}: the ${stage.name} SLA of ${stage.slaHours}h was breached.`,
    actorId: "system",
    actorRole: stage.approverRoles[0],
    onBehalfOfId: null,
    automated: true,
    at: now.toISOString(),
  }
  const workflow = moveTo(
    { ...wf, route: extendRoute(definition, wf.route, target.key), decisions: [...wf.decisions, decision] },
    target.key,
    now,
  )
  return { status: "pending_approval", workflow, outcome: "escalated", decision }
}
