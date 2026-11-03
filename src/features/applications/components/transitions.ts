import { ClipboardCheck, Landmark, RefreshCw, RotateCcw, Send, ShieldCheck, type LucideIcon } from "lucide-react"
import type { Permission } from "@/lib/rbac/permissions"
import type { Application, ApplicationStatus, ApplicationTransition } from "../types"
import { requiredChecks } from "../utils/checks"
import { OFFER_VALID_DAYS } from "../utils/offer"

export interface TransitionAction {
  transition: ApplicationTransition
  label: string
  icon: LucideIcon
  permission: Permission
  /** What happens, shown in the PIN dialog. */
  outcome: string
  warning?: string
}

export const TRANSITIONS: Partial<Record<ApplicationStatus, TransitionAction>> = {
  submitted: {
    transition: "start_verification",
    label: "Start verification",
    icon: ShieldCheck,
    permission: "verification:run",
    outcome: "You take the application into verification so identity, bureau and screening checks can run.",
  },
  in_verification: {
    transition: "complete_verification",
    label: "Complete verification",
    icon: ClipboardCheck,
    permission: "verification:run",
    outcome: "You confirm the checks are complete. The application moves to credit assessment.",
  },
  in_assessment: {
    transition: "submit_for_approval",
    label: "Submit for approval",
    icon: Send,
    permission: "assessment:edit",
    outcome: "The application and your assessment enter the approval workflow for its amount band.",
  },
  returned: {
    transition: "resubmit",
    label: "Resubmit",
    icon: RotateCcw,
    permission: "application:edit",
    outcome: "The application goes back to the stage that returned it.",
  },
  more_info_requested: {
    transition: "resubmit",
    label: "Resubmit with information",
    icon: RotateCcw,
    permission: "application:edit",
    outcome: "The application goes back to the approver who asked for more information.",
  },
  approved: {
    transition: "send_offer",
    label: "Send offer to customer",
    icon: Send,
    permission: "offer:send",
    outcome: `A new offer with its own number and secure link goes to the customer by SMS and email. It is valid for ${OFFER_VALID_DAYS} days.`,
  },
  offer_accepted: {
    transition: "mark_ready",
    label: "Hand over to finance",
    icon: Landmark,
    permission: "handover:view",
    outcome: "Finance receives the accepted offer and can disburse. Origination ends here.",
  },
}

export const RESEND_OFFER: TransitionAction = {
  transition: "resend_offer",
  label: "Resend offer",
  icon: RefreshCw,
  permission: "offer:send",
  outcome: `The customer gets a new offer number and link, valid for ${OFFER_VALID_DAYS} days.`,
  warning: "The current link stops working as soon as you confirm.",
}

/** Mirrors the server's own checks, so the button is never offered when it would fail. */
export function blockedReason(app: Application, transition: ApplicationTransition): string | null {
  switch (transition) {
    case "complete_verification": {
      const outstanding = requiredChecks(app).filter((k) => !app.verification.some((v) => v.kind === k))
      if (outstanding.length)
        return `Run the ${outstanding.length} outstanding check${outstanding.length === 1 ? "" : "s"} on the Verification tab first.`
      return null
    }
    case "submit_for_approval":
      return app.assessment ? null : "Save the credit assessment on the Assessment tab first."
    default:
      return null
  }
}

/** Before approval, the team working the stage can reject the application or return it to the officer. */
export const REVIEW_STAGE: Partial<Record<ApplicationStatus, { permission: Permission; stageName: string }>> = {
  submitted: { permission: "verification:run", stageName: "Verification" },
  in_verification: { permission: "verification:run", stageName: "Verification" },
  in_assessment: { permission: "assessment:edit", stageName: "Assessment" },
}
