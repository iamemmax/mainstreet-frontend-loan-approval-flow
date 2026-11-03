"use client"

import { Ban, Check, Copy, FilePen, Info, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { DecisionDialog } from "@/components/shared/decision-dialog"
import { MoneyText } from "@/components/shared/money-text"
import { usePinConfirm } from "@/components/shared/pin-confirm"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession } from "@/features/auth/hooks/use-session"
import { useApprovalEligibility } from "@/features/workflow/hooks/use-approval-eligibility"
import { useWorkflowDefinitions } from "@/features/workflow/hooks/use-workflows"
import type { DecisionAction } from "@/features/workflow/types"
import { DECISION_ACTION_LABELS } from "@/features/workflow/engine"
import { can } from "@/lib/rbac/can"
import { cn } from "@/lib/utils"
import { useDecideApplication, useMoveApplication } from "../hooks/use-applications"
import { useIsOnDesk } from "../hooks/use-is-on-desk"
import type { Application } from "../types"
import { currentOffer } from "../utils/offer"
import { ReviewButtons } from "./review-buttons"
import { blockedReason, RESEND_OFFER, TRANSITIONS, type TransitionAction } from "./transitions"

interface ApplicationActionsProps {
  application: Application
  applicantName: string
  stageName: string | null
  /** Full-width buttons stacked with the main action on top, for the side panel. */
  stack?: boolean
}

/** Renders exactly what the workflow engine and the user's permissions allow, and only to whoever has the application now. */
export function ApplicationActions({ application, applicantName, stageName, stack }: ApplicationActionsProps) {
  const session = useSession()
  const eligibility = useApprovalEligibility(application)
  const move = useMoveApplication(application.id)
  const pin = usePinConfirm()
  const offer = currentOffer(application)
  const onDesk = useIsOnDesk(application)

  const t = TRANSITIONS[application.status]
  const canMove = t && can(session, t.permission) && onDesk
  const blocked = t ? blockedReason(application, t.transition) : null

  const confirmTransition = (action: TransitionAction) =>
    pin.confirm({
      title: action.label,
      icon: action.icon,
      description: action.outcome,
      facts: [
        { label: "Application", value: <span className="font-mono">{application.reference}</span> },
        { label: "Applicant", value: applicantName },
        { label: "Amount", value: <MoneyText value={application.amountRequested} /> },
        ...(action.transition === "resend_offer" && offer
          ? [{ label: "Replaces", value: <span className="font-mono">{offer.number}</span> }]
          : []),
      ],
      warning: action.warning,
      confirmLabel: action.label,
      run: async (p) => {
        const updated = await move.mutateAsync({ transition: action.transition, pin: p })
        const issued =
          action.transition === "send_offer" || action.transition === "resend_offer" ? currentOffer(updated) : null
        toast.success(issued ? `Offer ${issued.number} sent` : `${action.label} — done`)
      },
    })

  const copyOfferLink = async () => {
    if (!offer) return
    const url = `${window.location.origin}/offer/${offer.token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Offer link copied")
    } catch {
      toast.message(url)
    }
  }

  const secondary = (
    <>
      {application.status === "offer_sent" && offer && (
        <Button variant="outline" onClick={copyOfferLink}>
          <Copy aria-hidden /> {stack ? "Copy link" : "Copy offer link"}
        </Button>
      )}
      {application.status === "offer_sent" && can(session, RESEND_OFFER.permission) && onDesk && (
        <Button variant="outline" onClick={() => confirmTransition(RESEND_OFFER)}>
          <RESEND_OFFER.icon aria-hidden /> {RESEND_OFFER.label}
        </Button>
      )}
      <ReviewButtons application={application} applicantName={applicantName} />
    </>
  )
  // A draft is finished in the intake form, which also submits it.
  const continueDraft = application.status === "draft" && onDesk && can(session, "application:edit") && (
    <Button asChild className={cn(stack && "w-full")}>
      <Link href={`/applications/${application.id}/edit`}>
        <FilePen aria-hidden /> Continue application
      </Link>
    </Button>
  )
  const primary = canMove && (
    <Button
      variant={eligibility?.allowed ? "outline" : "default"}
      disabled={!!blocked}
      className={cn(stack && "w-full")}
      onClick={() => confirmTransition(t)}
    >
      <t.icon aria-hidden />
      {t.label}
    </Button>
  )

  if (stack) {
    // Side panel: the main action first, why it's waiting (if it is), then the secondary actions side by side.
    return (
      <div className="space-y-2.5">
        <DecisionButtons application={application} applicantName={applicantName} stageName={stageName} block />
        {continueDraft}
        {primary}
        {canMove && blocked && (
          <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {blocked}
          </p>
        )}
        <div className="grid auto-cols-fr grid-flow-col gap-2 empty:hidden [&>button]:w-full">{secondary}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {secondary}
      {continueDraft}
      {primary &&
        (blocked ? (
          // Shown but disabled, so it's clear what the step is and what it's waiting for.
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex">
                {primary}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{blocked}</TooltipContent>
          </Tooltip>
        ) : (
          primary
        ))}
      <DecisionButtons application={application} applicantName={applicantName} stageName={stageName} />
    </div>
  )
}

interface DecisionButtonsProps {
  application: Application
  applicantName: string
  stageName: string | null
  /** Stretch to the container, e.g. in the side panel. */
  block?: boolean
}

/**
 * Approve, decline and the less common decisions, exactly as the workflow
 * engine allows. At a committee stage these are votes.
 */
export function DecisionButtons({ application, applicantName, stageName, block }: DecisionButtonsProps) {
  const eligibility = useApprovalEligibility(application)
  const decide = useDecideApplication(application.id)
  const { data: definitions } = useWorkflowDefinitions()
  // The action is kept after closing so the dialog doesn't change title while it animates out.
  const [dialogAction, setDialogActionState] = useState<DecisionAction>("approve")
  const [dialogOpen, setDialogOpen] = useState(false)
  const setDialogAction = (a: DecisionAction) => {
    setDialogActionState(a)
    setDialogOpen(true)
  }

  if (application.status !== "pending_approval" || !eligibility) return null
  const definition = definitions?.find((d) => d.id === application.workflow?.definitionId)
  const stage =
    definition && application.workflow?.currentStageKey
      ? definition.stages.find((s) => s.key === application.workflow!.currentStageKey)
      : undefined
  const committee = stage?.committee
    ? { votesRequired: stage.committee.votesRequired, members: stage.committee.memberIds.length }
    : null
  const approveLabel = committee ? "Vote to approve" : "Approve"
  const declineLabel = committee ? "Vote to decline" : "Decline"

  if (!eligibility.allowed) {
    // Approvers who are blocked still see the button, with the reason; other roles see nothing.
    if (eligibility.reason === "not_your_stage") return null
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={cn("inline-flex", block && "w-full")}>
            <Button disabled className={cn(block && "w-full")}>
              <Check aria-hidden /> {approveLabel}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{eligibility.message}</TooltipContent>
      </Tooltip>
    )
  }

  const others = eligibility.allowedActions.filter((a) => a !== "approve" && a !== "reject")
  return (
    // In the side panel approve gets its own row, so committee labels never get squeezed.
    <div className={cn(block ? "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2" : "flex gap-2")}>
      <Button className={cn(block && "col-span-2")} onClick={() => setDialogAction("approve")}>
        <Check aria-hidden /> {approveLabel}
      </Button>
      <Button
        variant="outline"
        className={cn("text-destructive hover:text-destructive", block && others.length === 0 && "col-span-2")}
        onClick={() => setDialogAction("reject")}
      >
        <Ban aria-hidden /> {declineLabel}
      </Button>
      {others.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More decisions">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {others.map((a) => (
              <DropdownMenuItem key={a} onSelect={() => setDialogAction(a)}>
                {DECISION_ACTION_LABELS[a]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        committee={committee}
        context={{
          reference: application.reference,
          applicantName,
          amount: application.amountRequested,
          stageName: stageName ?? "Approval",
          onBehalfOfName: eligibility.onBehalfOf?.name,
        }}
        onSubmit={async (input, pin) => {
          const result = await decide.mutateAsync({ input, pin })
          const tally =
            committee && result.status === "pending_approval" && result.workflow?.currentStageKey === stage?.key
          toast.success(
            tally
              ? "Vote recorded — waiting for the other committee members"
              : `${DECISION_ACTION_LABELS[input.action]} recorded`,
          )
        }}
      />
    </div>
  )
}

/** Explains why the signed-in user can't act, so the page never looks broken. */
export function EligibilityNote({ application }: { application: Application }) {
  const eligibility = useApprovalEligibility(application)
  if (application.status !== "pending_approval" || !eligibility || eligibility.allowed) return null
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {eligibility.message}
    </p>
  )
}
