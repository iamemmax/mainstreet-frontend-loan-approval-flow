import type { ApplicationStatus } from "@/features/applications/schemas/status"
import { WorkflowEngineError } from "./errors"

/**
 * The only legal status transitions. Everything that changes an application's
 * status goes through `assertTransition`.
 */
export const STATUS_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["in_verification", "returned", "rejected"],
  in_verification: ["in_assessment", "returned", "rejected"],
  in_assessment: ["pending_approval", "returned", "rejected"],
  pending_approval: ["pending_approval", "approved", "rejected", "returned", "more_info_requested"],
  returned: ["submitted", "pending_approval"],
  more_info_requested: ["pending_approval"],
  approved: ["offer_sent"],
  rejected: [],
  offer_sent: ["offer_accepted", "approved"],
  offer_accepted: ["ready_for_disbursement"],
  ready_for_disbursement: [],
}

export const TERMINAL_STATUSES: readonly ApplicationStatus[] = ["rejected", "ready_for_disbursement"]

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to)
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransition(from, to)) {
    throw new WorkflowEngineError("invalid_transition", `Cannot move an application from ${from} to ${to}`)
  }
}
