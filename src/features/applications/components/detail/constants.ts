import type { Tone } from "@/components/shared/tone"
import type { Decision } from "@/features/workflow/types"
import { ROLE_PROFILE } from "@/lib/rbac/profiles"
import type { Role } from "@/lib/rbac/roles"
import { APPROVED_STATUSES } from "../../schemas/status"
import type { Application, ApplicationFlag, OfferRecord, VerificationResult } from "../../types"

export const TABS = ["overview", "applicant", "verification", "credit", "assessment", "workflow", "activity"] as const

export const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  overview: "Overview",
  applicant: "Applicant & parties",
  verification: "Verification",
  credit: "Credit history",
  assessment: "Assessment",
  workflow: "Approvals",
  activity: "Activity",
}

export type Tab = (typeof TABS)[number]

/** Tabs that have something to show yet and that this role works with, so nobody opens an empty one. */
export function visibleTabs(app: Application, role: Role): Tab[] {
  const shown: Record<Tab, boolean> = {
    overview: true,
    applicant: true,
    verification: ROLE_PROFILE[role].seesVerification && (app.submittedAt !== null || app.verification.length > 0),
    credit: app.creditHistory !== null,
    assessment: app.assessment !== null || app.status === "in_assessment",
    workflow: app.workflow !== null,
    activity: true,
  }
  return TABS.filter((t) => shown[t])
}

/** There's an offer to look at once the loan is approved, or once one has been issued. */
export function hasOffer(app: Application): boolean {
  return app.offers.length > 0 || APPROVED_STATUSES.includes(app.status)
}

export const FLAG_TEXT: Record<ApplicationFlag, { title: string; body: string }> = {
  duplicate_applicant: {
    title: "Possible duplicate applicant",
    body: "Another application uses the same BVN. Check it before deciding.",
  },
  bvn_failed: { title: "BVN verification failed", body: "The BVN did not match the applicant's details." },
  pep_hit: { title: "Politically exposed person", body: "Enhanced due diligence is required." },
  self_approval_attempt: {
    title: "Self-approval was attempted",
    body: "The creator tried to approve their own application. It was blocked.",
  },
  auto_escalated: { title: "Auto-escalated", body: "This application moved up a level after its SLA was breached." },
}

export const DECISION_TONE: Record<Decision["action"], Tone> = {
  approve: "success",
  reject: "danger",
  return: "warning",
  escalate: "accent",
  request_info: "warning",
}

export const OFFER_STEPS = [
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Offer sent" },
  { key: "accepted", label: "Accepted by customer" },
  { key: "handed", label: "Handed to finance" },
] as const

/** How each issued offer reads in the offer history. "expired" is derived from the expiry date. */
export const OFFER_STATUS: Record<OfferRecord["status"] | "expired", { label: string; tone: Tone }> = {
  sent: { label: "Awaiting customer", tone: "info" },
  expired: { label: "Expired", tone: "danger" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  superseded: { label: "Replaced", tone: "neutral" },
}

export const CHECK_LABELS: Record<VerificationResult["kind"], { name: string; what: string }> = {
  bvn: { name: "BVN", what: "Bank Verification Number" },
  nin: { name: "NIN", what: "National Identity Number" },
  phone: { name: "Phone number", what: "Registered to the applicant" },
  cac: { name: "CAC registration", what: "Corporate Affairs Commission" },
  employer: { name: "Employer & salary", what: "Confirmed with HR" },
  bank_statement: { name: "Bank statement analysis", what: "Last 6 months of inflows" },
  bureau_crc: { name: "CRC Credit Bureau", what: "Consumer and commercial credit" },
  bureau_firstcentral: { name: "FirstCentral", what: "Credit history" },
  bureau_creditregistry: { name: "CreditRegistry", what: "Credit history" },
  pep_sanctions: { name: "PEP & sanctions", what: "Politically exposed persons and watchlists" },
  blacklist: { name: "Internal blacklist", what: "The Bank's own list" },
}

export const CHECK_GROUPS: { title: string; kinds: VerificationResult["kind"][] }[] = [
  { title: "Identity", kinds: ["bvn", "nin", "phone", "cac"] },
  { title: "Income & statements", kinds: ["employer", "bank_statement"] },
  { title: "Credit bureaus", kinds: ["bureau_crc", "bureau_firstcentral", "bureau_creditregistry"] },
  { title: "Screening", kinds: ["pep_sanctions", "blacklist"] },
]

export const RECOMMENDATIONS = [
  { value: "approve", label: "Approve", hint: "Within policy, no conditions needed", tone: "success" },
  { value: "refer", label: "Approve with conditions", hint: "e.g. extra guarantor or reduced amount", tone: "warning" },
  { value: "decline", label: "Decline", hint: "Outside policy or risk appetite", tone: "danger" },
] as const
