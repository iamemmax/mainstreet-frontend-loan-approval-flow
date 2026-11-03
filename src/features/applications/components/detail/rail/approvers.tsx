"use client"

import { ToneBadge } from "@/components/shared/status-badge"
import type { User } from "@/features/auth/types"
import type { Delegation, WorkflowStage } from "@/features/workflow/types"
import { initials } from "@/lib/format/name"
import { ROLE_LABELS } from "@/lib/rbac/roles"
import { cn } from "@/lib/utils"
import type { Application } from "../../../types"

/** Who can decide right now: the committee with each member's vote, or the people holding the stage's role. */
export function Approvers({
  app,
  stage,
  users,
  delegations,
}: {
  app: Application
  stage: WorkflowStage
  users: User[]
  delegations: Delegation[]
}) {
  const wf = app.workflow!
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—"
  const now = Date.now()
  const coveredBy = (id: string) => {
    const d = delegations.find(
      (x) => x.fromUserId === id && new Date(x.startsAt).getTime() <= now && now <= new Date(x.endsAt).getTime(),
    )
    return d ? nameOf(d.toUserId) : null
  }

  if (stage.committee) {
    const { memberIds, votesRequired } = stage.committee
    const approvals = wf.stageVotes.filter((v) => v.vote === "approve").length
    const declines = wf.stageVotes.length - approvals
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium whitespace-nowrap">Committee votes</span>
          <span className="tabular text-right text-muted-foreground">
            <span className="font-semibold text-foreground">{approvals}</span> of {votesRequired} approvals
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {memberIds.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < approvals ? "bg-success" : i < approvals + declines ? "bg-destructive" : "bg-muted",
              )}
            />
          ))}
        </div>
        <ul className="space-y-2.5">
          {memberIds.map((id) => {
            const vote = wf.stageVotes.find((v) => v.userId === id)
            const cover = coveredBy(id)
            return (
              <li key={id} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-[11px] font-semibold text-primary">
                  {initials(nameOf(id))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{nameOf(id)}</div>
                  {cover && !vote && (
                    <div className="truncate text-xs text-muted-foreground">Away · {cover} can vote for them</div>
                  )}
                </div>
                {vote ? (
                  <ToneBadge tone={vote.vote === "approve" ? "success" : "danger"}>
                    {vote.vote === "approve" ? "Approved" : "Declined"}
                  </ToneBadge>
                ) : (
                  <span className="text-xs text-muted-foreground">Not voted yet</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  const earlier = new Set(
    wf.decisions.filter((d) => d.stageKey !== stage.key && d.action === "approve").map((d) => d.actorId),
  )
  const people = users.filter(
    (u) =>
      stage.approverRoles.includes(u.role) && u.status !== "inactive" && u.id !== app.createdById && !earlier.has(u.id),
  )
  return (
    <div className="space-y-2.5">
      <div className="text-sm font-medium">Waiting on</div>
      {people.length === 0 ? (
        <p className="text-sm text-warning">Nobody eligible holds this role. Escalate or reassign.</p>
      ) : (
        <ul className="space-y-2.5">
          {people.map((u) => {
            const cover = u.status === "away" ? coveredBy(u.id) : null
            return (
              <li key={u.id} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-[11px] font-semibold text-primary">
                  {initials(u.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {cover ? `Away · ${cover} is covering` : ROLE_LABELS[u.role]}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
