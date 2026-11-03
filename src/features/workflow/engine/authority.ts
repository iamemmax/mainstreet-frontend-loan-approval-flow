import type { ApplicationStatus } from "@/features/applications/schemas/status"
import type { Role } from "@/lib/rbac/roles"
import type { DecisionAction, WorkflowDefinition, WorkflowState } from "../types"
import { getStage, nextStageInDefinition } from "./route"

export interface EngineApplication {
  status: ApplicationStatus
  createdById: string
  workflow: WorkflowState | null
}

export interface EngineActor {
  id: string
  role: Role
}

/** A delegation the actor has received, with the delegator's role resolved. */
export interface EngineDelegation {
  fromUserId: string
  fromUserName: string
  fromRole: Role
  startsAt: string
  endsAt: string
}

export type ActBlockReason =
  "not_pending" | "not_your_stage" | "maker_checker" | "segregation_of_duties" | "already_approved" | "already_voted"

export type ActEvaluation =
  | {
      allowed: true
      actingRole: Role
      /** Set when the actor is acting under someone else's delegation. */
      onBehalfOf: { userId: string; name: string } | null
      allowedActions: DecisionAction[]
    }
  | {
      allowed: false
      reason: ActBlockReason
      message: string
    }

export interface CanActInput {
  application: EngineApplication
  definition: WorkflowDefinition
  actor: EngineActor
  delegations: readonly EngineDelegation[]
  now: Date
}

function isActive(d: EngineDelegation, now: Date): boolean {
  const t = now.getTime()
  return new Date(d.startsAt).getTime() <= t && t <= new Date(d.endsAt).getTime()
}

/**
 * Decides whether `actor` may take a decision on the application right now,
 * and which actions they may take. The UI renders exactly what this returns.
 */
export function canAct({ application, definition, actor, delegations, now }: CanActInput): ActEvaluation {
  const wf = application.workflow
  if (application.status !== "pending_approval" || !wf?.currentStageKey) {
    return { allowed: false, reason: "not_pending", message: "This application is not awaiting an approval decision." }
  }

  const stage = getStage(definition, wf.currentStageKey)

  let actingRole: Role | null = null
  let onBehalfOf: { userId: string; name: string } | null = null
  if (stage.committee) {
    // Committee seats belong to named members, not to a role.
    const members = stage.committee.memberIds
    if (members.includes(actor.id)) {
      actingRole = actor.role
    } else {
      const delegation = delegations.find((d) => isActive(d, now) && members.includes(d.fromUserId))
      if (delegation) {
        actingRole = delegation.fromRole
        onBehalfOf = { userId: delegation.fromUserId, name: delegation.fromUserName }
      }
    }
  } else if (stage.approverRoles.includes(actor.role)) {
    actingRole = actor.role
  } else {
    const delegation = delegations.find((d) => isActive(d, now) && stage.approverRoles.includes(d.fromRole))
    if (delegation) {
      actingRole = delegation.fromRole
      onBehalfOf = { userId: delegation.fromUserId, name: delegation.fromUserName }
    }
  }

  if (!actingRole) {
    return {
      allowed: false,
      reason: "not_your_stage",
      message: stage.committee
        ? `This application is with the ${stage.name}. Only its members can vote.`
        : `This application is at the ${stage.name} stage, which your role cannot act on.`,
    }
  }

  if (application.createdById === actor.id) {
    return {
      allowed: false,
      reason: "maker_checker",
      message:
        "You created this application. Maker-checker rules require a different officer to make every approval decision on it.",
    }
  }
  if (onBehalfOf && application.createdById === onBehalfOf.userId) {
    return {
      allowed: false,
      reason: "maker_checker",
      message: `${onBehalfOf.name} created this application, so it cannot be decided under their delegation.`,
    }
  }

  const decidedEarlier = wf.decisions.some(
    (d) => d.actorId === actor.id && d.stageKey !== stage.key && d.action === "approve",
  )
  if (decidedEarlier) {
    return {
      allowed: false,
      reason: "segregation_of_duties",
      message: "You approved this application at an earlier stage. Each stage needs a different approver.",
    }
  }

  const voter = onBehalfOf?.userId ?? actor.id
  const vote = stage.committee ? wf.stageVotes.find((v) => v.userId === voter) : undefined
  if (vote) {
    return {
      allowed: false,
      reason: "already_voted",
      message: `${onBehalfOf ? `${onBehalfOf.name} has` : "You've"} already voted to ${vote.vote}. Waiting for the other committee members.`,
    }
  }

  if (!stage.committee && wf.stageApprovals.some((a) => a.userId === actor.id || a.role === actingRole)) {
    return {
      allowed: false,
      reason: "already_approved",
      message: "Your approval for this parallel stage is recorded. Waiting for the other approvers.",
    }
  }

  const allowedActions: DecisionAction[] = ["approve", "reject", "return", "request_info"]
  if (nextStageInDefinition(definition, stage.key)) allowedActions.splice(3, 0, "escalate")

  return { allowed: true, actingRole, onBehalfOf, allowedActions }
}

/**
 * The highest amount a stage can close on its own, derived from the bands.
 * `null` means uncapped; `0` means the stage can never be final.
 */
export function authorityLimitForStage(definition: WorkflowDefinition, stageKey: string): number | null {
  const bands = definition.bands.filter((b) => b.finalStageKey === stageKey)
  if (bands.length === 0) return 0
  if (bands.some((b) => b.maxAmount === null)) return null
  return Math.max(...bands.map((b) => b.maxAmount ?? 0))
}
