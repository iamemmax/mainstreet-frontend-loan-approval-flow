"use client"

import {
  ArrowRight,
  Ban,
  Calculator,
  CircleCheck,
  Clock,
  CornerUpLeft,
  FilePen,
  Landmark,
  type LucideIcon,
  Mail,
  MessageCircleQuestion,
  ScanSearch,
  Send,
} from "lucide-react"
import type { User } from "@/features/auth/types"
import { DECISION_REASONS } from "@/features/workflow/engine"
import type { Delegation, WorkflowStage } from "@/features/workflow/types"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import type { Application } from "../../../types"
import { currentOffer, isOfferExpired } from "../../../utils/offer"
import { ApplicationActions } from "../../application-actions"
import { NEXT_STEP } from "../constants"
import { Approvers } from "./approvers"
import { Journey } from "./journey"
import { RailRow, RailSection } from "./ui"

interface NextStepProps {
  app: Application
  stage: WorkflowStage | null
  applicantName: string
  users: User[]
  delegations: Delegation[]
}

/** Who the application is waiting on, outside the approval stages (those name their approvers). */
const OWNER: Partial<Record<Application["status"], string>> = {
  draft: "the relationship officer",
  submitted: "the verification team",
  in_verification: "the verification team",
  in_assessment: "the credit analyst",
  returned: "the relationship officer",
  more_info_requested: "the relationship officer",
  approved: "the relationship officer, to send the offer",
  offer_sent: "the customer",
  offer_accepted: "finance",
  ready_for_disbursement: "finance, to disburse",
}

const NEXT_ICON: Partial<Record<Application["status"], LucideIcon>> = {
  draft: FilePen,
  submitted: ScanSearch,
  in_verification: ScanSearch,
  in_assessment: Calculator,
  returned: CornerUpLeft,
  more_info_requested: MessageCircleQuestion,
  approved: Send,
  offer_sent: Mail,
  offer_accepted: Landmark,
  ready_for_disbursement: CircleCheck,
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

/** The top of the panel: what happens next, and the buttons to do it. */
export function NextStep({ app, stage, applicantName, users, delegations }: NextStepProps) {
  const pending = app.status === "pending_approval" && stage
  const offer = currentOffer(app)
  const offerExpired = app.status === "offer_sent" && !!offer && isOfferExpired(offer)
  const closed = app.status === "rejected" ? rejection(app) : null
  const nameOf = (id: string | null) => users.find((u) => u.id === id)?.name ?? "System"
  const NextIcon = offerExpired ? Clock : (NEXT_ICON[app.status] ?? ArrowRight)

  return (
    <RailSection title={pending ? "Decision" : "Next step"}>
      <Journey app={app} />
      {pending ? (
        <>
          <dl className="space-y-2.5">
            <RailRow label="Current stage">{stage.name}</RailRow>
          </dl>
          <div className="rounded-xl border border-border/70 p-3.5">
            <Approvers app={app} stage={stage} users={users} delegations={delegations} />
          </div>
        </>
      ) : closed ? (
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
      ) : (
        <div
          className={cn(
            "flex gap-3 rounded-xl border p-3.5",
            offerExpired ? "border-warning/30 bg-warning/[0.07]" : "border-primary/15 bg-primary/[0.04]",
          )}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              offerExpired ? "bg-warning/15 text-warning" : "bg-primary text-primary-foreground",
            )}
          >
            <NextIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm leading-snug font-semibold text-pretty">
              {offerExpired ? "The offer expired without a response" : (NEXT_STEP[app.status] ?? "—")}
            </p>
            <p className="text-xs text-muted-foreground">
              {offerExpired ? (
                "Resend it if the customer still wants the loan."
              ) : (
                <>
                  Waiting on <span className="font-medium text-foreground">{OWNER[app.status] ?? "—"}</span>
                </>
              )}
            </p>
          </div>
        </div>
      )}
      <ApplicationActions application={app} applicantName={applicantName} stageName={stage?.name ?? null} stack />
    </RailSection>
  )
}
