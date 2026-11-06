"use client"

import { Ban, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { User } from "@/features/auth/types"
import { DECISION_REASONS } from "@/features/workflow/engine"
import type { WorkflowStage } from "@/features/workflow/types"
import { formatDate } from "@/lib/format/date"
import type { Application } from "../../../types"
import { ApplicationActions } from "../../application-actions"
import { hasOffer } from "../constants"
import { offerStatusLine } from "../offer/status-line"
import { RailRow } from "./ui"

interface RailActionsProps {
  app: Application
  stage: WorkflowStage | null
  applicantName: string
  users: User[]
  onOpenOffer: () => void
}

/** Who rejected it and why, whether before approval (a message) or at an approval stage (a decision). */
function rejection(app: Application) {
  const message = app.messages.findLast((m) => m.kind === "rejection")
  const decision = app.workflow?.decisions.findLast((d) => d.action === "reject")
  const latest = message && (!decision || message.at > decision.at) ? message : null
  if (latest) return { actorId: latest.authorId, at: latest.at, reasonCode: latest.reasonCode, comment: latest.body }
  if (decision)
    return { actorId: decision.actorId, at: decision.at, reasonCode: decision.reasonCode, comment: decision.comment }
  return null
}

/** The top of the panel: the approval stage it's at, why it was rejected, and the buttons to act. */
export function RailActions({ app, stage, applicantName, users, onOpenOffer }: RailActionsProps) {
  const pending = app.status === "pending_approval" && stage
  const closed = app.status === "rejected" ? rejection(app) : null
  const nameOf = (id: string | null) => users.find((u) => u.id === id)?.name ?? "System"

  return (
    // Hidden when there's nothing in it: no stage, no rejection, no buttons for this user.
    <section aria-label="Actions" className="space-y-3.5 px-5 py-5 [&:not(:has(a,button,dl,p))]:hidden">
      {pending && (
        <dl>
          <RailRow label="Current stage">{stage.name}</RailRow>
        </dl>
      )}
      {closed && (
        <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3.5 text-sm">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <Ban className="size-4" aria-hidden /> Rejected
          </div>
          <p className="text-muted-foreground">
            By <span className="font-medium text-foreground">{nameOf(closed.actorId)}</span> on {formatDate(closed.at)}
            {closed.reasonCode && (
              <> · {DECISION_REASONS.reject.find((r) => r.code === closed.reasonCode)?.label ?? closed.reasonCode}</>
            )}
          </p>
          <p className="text-pretty">&ldquo;{closed.comment}&rdquo;</p>
        </div>
      )}
      <ApplicationActions application={app} applicantName={applicantName} stageName={stage?.name ?? null} stack />
      {hasOffer(app) && (
        <div className="space-y-1.5">
          <Button variant="outline" className="w-full" onClick={onOpenOffer}>
            <HandCoins aria-hidden /> Offer
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{offerStatusLine(app)}</p>
        </div>
      )}
    </section>
  )
}
