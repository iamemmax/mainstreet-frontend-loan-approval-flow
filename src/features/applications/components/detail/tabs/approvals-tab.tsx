"use client"

import { Bot, CircleCheck, CircleX, TriangleAlert, Undo2 } from "lucide-react"
import type { ReactNode } from "react"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { type StepItem, Stepper } from "@/components/shared/stepper"
import { Timeline, type TimelineItem } from "@/components/shared/timeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DECISION_ACTION_LABELS, DECISION_REASONS, getStage } from "@/features/workflow/engine"
import type { Decision, WorkflowDefinition, WorkflowStage } from "@/features/workflow/types"
import { ROLE_LABELS } from "@/lib/rbac/roles"
import type { Application } from "../../../types"
import { DECISION_TONE } from "../constants"

function reasonLabel(d: Decision) {
  return DECISION_REASONS[d.action].find((r) => r.code === d.reasonCode)?.label ?? d.reasonCode
}

const DECISION_ICON: Record<Decision["action"], ReactNode> = {
  approve: <CircleCheck aria-hidden />,
  reject: <CircleX aria-hidden />,
  return: <Undo2 aria-hidden />,
  escalate: <TriangleAlert aria-hidden />,
  request_info: <Undo2 aria-hidden />,
}

/** The line under each approval stage: votes, who decided, or who will decide and the SLA. */
function stepDescription(
  app: Application,
  key: string,
  state: StepItem["state"],
  stage: WorkflowStage,
  userName: (id: string) => string,
): string {
  const wf = app.workflow!
  const decisions = wf.decisions.filter((d) => d.stageKey === key)
  const lastDecision = decisions.at(-1)
  if (stage.committee && state === "current") {
    const approveVotes = wf.stageVotes.filter((v) => v.vote === "approve").length
    return `${approveVotes} of ${stage.committee.votesRequired} approve votes · ${wf.stageVotes.length} of ${stage.committee.memberIds.length} members voted`
  }
  if (stage.committee && state === "complete") {
    const approvers = decisions.filter((d) => d.action === "approve").map((d) => userName(d.actorId))
    return `Committee approved · ${approvers.join(", ")}`
  }
  if (lastDecision) return `${DECISION_ACTION_LABELS[lastDecision.action]} · ${userName(lastDecision.actorId)}`
  if (stage.committee) {
    return `Committee vote · ${stage.committee.votesRequired} of ${stage.committee.memberIds.length} · ${stage.slaHours}h SLA`
  }
  return `${stage.approverRoles.map((r) => ROLE_LABELS[r]).join(" + ")} · ${stage.slaHours}h SLA`
}

export function ApprovalsTab({
  app,
  definition,
  userName,
}: {
  app: Application
  definition?: WorkflowDefinition
  userName: (id: string) => string
}) {
  const wf = app.workflow
  if (!wf || !definition) {
    return (
      <Card>
        <EmptyState
          title="Not in approval yet"
          description="The approval route is fixed when the application is submitted for approval after verification and credit assessment."
        />
      </Card>
    )
  }
  const currentIndex = wf.currentStageKey ? wf.route.indexOf(wf.currentStageKey) : wf.route.length
  const steps: StepItem[] = wf.route.map((key, i) => {
    const s = getStage(definition, key)
    const lastDecision = wf.decisions.filter((d) => d.stageKey === key).at(-1)
    let state: StepItem["state"] = "upcoming"
    if (app.status === "rejected" && lastDecision?.action === "reject") state = "error"
    else if (i < currentIndex) state = "complete"
    else if (i === currentIndex && app.status === "pending_approval") state = "current"
    return {
      id: key,
      label: s.name,
      description: stepDescription(app, key, state, s, userName),
      state,
    }
  })
  const items: TimelineItem[] = [...wf.decisions].reverse().map((d) => ({
    id: d.id,
    at: d.at,
    tone: DECISION_TONE[d.action],
    icon: d.automated ? <Bot aria-hidden /> : DECISION_ICON[d.action],
    title: `${DECISION_ACTION_LABELS[d.action]} at ${definition.stages.find((s) => s.key === d.stageKey)?.name ?? d.stageKey}`,
    actor: d.automated
      ? "Automated"
      : `${userName(d.actorId)} · ${ROLE_LABELS[d.actorRole]}${d.onBehalfOfId ? ` · on behalf of ${userName(d.onBehalfOfId)}` : ""}`,
    description: (
      <div className="space-y-1">
        <ToneBadge tone={DECISION_TONE[d.action]}>{reasonLabel(d)}</ToneBadge>
        <p className="text-pretty">{d.comment}</p>
      </div>
    ),
  }))

  return (
    <div className="grid gap-4 @4xl:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Approval route</CardTitle>
          <CardDescription>
            {definition.name} v{wf.definitionVersion} · fixed at submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stepper steps={steps} orientation="vertical" aria-label="Approval route" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Decisions</CardTitle>
          <CardDescription>Every decision with its reason and comment</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length ? <Timeline items={items} /> : <EmptyState size="sm" title="No decisions yet" />}
        </CardContent>
      </Card>
    </div>
  )
}
