import { DECISION_ACTION_LABELS } from "@/features/workflow/engine/reasons"
import type { DecisionAction } from "@/features/workflow/types"

export interface CommitteeRule {
  votesRequired: number
  members: number
}

const ACTION_HINT: Record<DecisionAction, string> = {
  approve: "Moves the application to the next stage, or closes approval if this is the final stage.",
  reject: "Ends the application. The applicant will need to apply again.",
  return: "Sends it back to the originating officer to correct and resubmit.",
  escalate: "Skips your decision and moves it to the next approval level.",
  request_info: "Pauses the SLA while the officer gathers more information.",
}

/** At a committee, approve and reject are votes; everything else reads as usual. */
export function actionLabel(action: DecisionAction, committee?: CommitteeRule | null) {
  if (committee && action === "approve") return "Vote to approve"
  if (committee && action === "reject") return "Vote to decline"
  return DECISION_ACTION_LABELS[action]
}

export function actionHint(action: DecisionAction, committee?: CommitteeRule | null) {
  if (committee && action === "approve")
    return `Counts as one approve vote. ${committee.votesRequired} approve votes approve the loan.`
  if (committee && action === "reject")
    return `Counts as one decline vote. The loan is declined once approval can no longer reach ${committee.votesRequired} votes.`
  return ACTION_HINT[action]
}

/** A warning shown at the PIN step for decisions that can't be taken back. */
export function irreversibleWarning(action: DecisionAction, committee?: CommitteeRule | null): string | null {
  if (action === "reject")
    return committee
      ? "Your vote can't be changed once it's recorded."
      : "This ends the application and cannot be undone."
  if (action === "escalate") return "You will not be able to decide on it again at this stage."
  return null
}

const CONFIRM_LABEL: Record<DecisionAction, string> = {
  approve: "Confirm approval",
  reject: "Confirm rejection",
  return: "Confirm return",
  escalate: "Confirm escalation",
  request_info: "Send request",
}

/** The final button on the PIN step. */
export function confirmLabel(action: DecisionAction, committee?: CommitteeRule | null) {
  return committee && (action === "approve" || action === "reject") ? "Cast vote" : CONFIRM_LABEL[action]
}

const DIALOG_TITLE: Record<DecisionAction, string> = {
  approve: "Approve application",
  reject: "Reject application",
  return: "Return for correction",
  escalate: "Escalate to the next level",
  request_info: "Request more information",
}

/** Heading of the first step, named after the button that opened it. */
export function dialogTitle(action: DecisionAction, committee?: CommitteeRule | null) {
  if (committee && (action === "approve" || action === "reject")) return actionLabel(action, committee)
  return DIALOG_TITLE[action]
}
