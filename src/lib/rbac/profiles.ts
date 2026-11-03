import type { ApplicationStatus } from "@/features/applications/schemas/status"
import type { Role } from "./roles"

/** Which team's dashboard a role gets. */
export const DASHBOARD_FOCUS = [
  "origination",
  "verification",
  "assessment",
  "approval",
  "finance",
  "oversight",
] as const
export type DashboardFocus = (typeof DASHBOARD_FOCUS)[number]

/** Dashboard focuses whose report is "My performance". */
export const PERSONAL_FOCUS = ["origination", "verification", "assessment"] as const
export type PersonalFocus = (typeof PERSONAL_FOCUS)[number]

export type ReportKind = "management" | "personal" | "finance"

export interface RoleProfile {
  dashboard: DashboardFocus
  /** Management sees the whole book, finance its handovers, everyone else their own work. */
  report: ReportKind
  /** Steps before approval this team owns; they see every application at these statuses. Approval stages come from the workflow. */
  owns: readonly ApplicationStatus[]
  /** Sees where the book is slowing down: stage times, turnaround and volume. */
  insights: boolean
}

/** Everything that differs by role, apart from permissions, in one place. */
export const ROLE_PROFILE: Record<Role, RoleProfile> = {
  relationship_officer: { dashboard: "origination", report: "personal", owns: [], insights: false },
  verification_officer: {
    dashboard: "verification",
    report: "personal",
    owns: ["submitted", "in_verification"],
    insights: false,
  },
  credit_analyst: { dashboard: "assessment", report: "personal", owns: ["in_assessment"], insights: false },
  credit_manager: { dashboard: "approval", report: "management", owns: [], insights: true },
  final_approver: { dashboard: "approval", report: "management", owns: [], insights: true },
  finance_officer: {
    dashboard: "finance",
    report: "finance",
    owns: ["offer_accepted", "ready_for_disbursement"],
    insights: false,
  },
  head_of_credit: { dashboard: "oversight", report: "management", owns: [], insights: true },
  auditor: { dashboard: "oversight", report: "management", owns: [], insights: true },
  admin: { dashboard: "oversight", report: "management", owns: [], insights: true },
}

/** The "My performance" report for a role, if it gets one. */
export function personalFocus(role: Role): PersonalFocus | null {
  const { dashboard, report } = ROLE_PROFILE[role]
  return report === "personal" ? (PERSONAL_FOCUS.find((f) => f === dashboard) ?? null) : null
}
