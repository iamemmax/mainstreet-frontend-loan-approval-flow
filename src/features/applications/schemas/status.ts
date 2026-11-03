import { z } from "zod"

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "in_verification",
  "in_assessment",
  "pending_approval",
  "returned",
  "more_info_requested",
  "approved",
  "rejected",
  "offer_sent",
  "offer_accepted",
  "ready_for_disbursement",
] as const

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES)
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

/** Submitted and still being worked before a decision. */
export const OPEN_STATUSES: readonly ApplicationStatus[] = [
  "submitted",
  "in_verification",
  "in_assessment",
  "pending_approval",
  "returned",
  "more_info_requested",
]
/** Sent back to the relationship officer. */
export const RETURNED_STATUSES: readonly ApplicationStatus[] = ["returned", "more_info_requested"]
/** Approved, whatever has happened since. */
export const APPROVED_STATUSES: readonly ApplicationStatus[] = [
  "approved",
  "offer_sent",
  "offer_accepted",
  "ready_for_disbursement",
]
/** When the offered amount or tenor may still change: at any step before the customer accepts. */
export const OFFER_ADJUSTABLE_STATUSES: readonly ApplicationStatus[] = [
  "draft",
  "submitted",
  "in_verification",
  "in_assessment",
  "pending_approval",
  "returned",
  "more_info_requested",
  "approved",
  "offer_sent",
]
/** When the credit assessment may still change: before final approval. */
export const ASSESSABLE_STATUSES: readonly ApplicationStatus[] = [
  "in_assessment",
  "pending_approval",
  "returned",
  "more_info_requested",
]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_verification: "In Verification",
  in_assessment: "In Assessment",
  pending_approval: "Pending Approval",
  returned: "Returned",
  more_info_requested: "More Info Requested",
  approved: "Approved",
  rejected: "Rejected",
  offer_sent: "Offer Sent",
  offer_accepted: "Offer Accepted",
  ready_for_disbursement: "Ready for Disbursement",
}

export const riskRatingSchema = z.enum(["low", "medium", "high"])
export type RiskRating = z.infer<typeof riskRatingSchema>

export const slaStateSchema = z.enum(["on_track", "due_soon", "breached"])
export type SlaState = z.infer<typeof slaStateSchema>
