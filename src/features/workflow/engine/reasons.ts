import type { DecisionAction } from "../types"

export interface ReasonOption {
  code: string
  label: string
}

/** Reason codes offered for each decision. Reporting groups by these codes. */
export const DECISION_REASONS: Record<DecisionAction, readonly ReasonOption[]> = {
  approve: [
    { code: "meets_policy", label: "Meets credit policy" },
    { code: "strong_affordability", label: "Strong affordability" },
    { code: "approved_with_conditions", label: "Approved with conditions" },
    { code: "policy_exception", label: "Approved as policy exception" },
  ],
  reject: [
    { code: "insufficient_affordability", label: "Insufficient affordability" },
    { code: "adverse_bureau", label: "Adverse credit bureau report" },
    { code: "kyc_failed", label: "KYC / identity verification failed" },
    { code: "fraud_suspected", label: "Fraud suspected" },
    { code: "outside_risk_appetite", label: "Outside risk appetite" },
  ],
  return: [
    { code: "incomplete_documents", label: "Incomplete or unclear documents" },
    { code: "data_mismatch", label: "Data mismatch across sources" },
    { code: "wrong_product", label: "Wrong product or structure" },
    { code: "other_correction", label: "Other correction required" },
  ],
  escalate: [
    { code: "above_authority", label: "Above my approval authority" },
    { code: "policy_exception", label: "Requires policy exception" },
    { code: "conflict_of_interest", label: "Conflict of interest" },
    { code: "sla_breach", label: "SLA breached" },
  ],
  request_info: [
    { code: "bank_statement", label: "Additional bank statements" },
    { code: "employer_confirmation", label: "Employer confirmation" },
    { code: "collateral_docs", label: "Collateral documentation" },
    { code: "clarification", label: "Clarification from applicant" },
  ],
}

export const DECISION_ACTION_LABELS: Record<DecisionAction, string> = {
  approve: "Approve",
  reject: "Reject",
  return: "Return for correction",
  escalate: "Escalate",
  request_info: "Request more information",
}

export function isValidReason(action: DecisionAction, code: string): boolean {
  return DECISION_REASONS[action].some((r) => r.code === code)
}
