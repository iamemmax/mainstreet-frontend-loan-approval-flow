import { z } from "zod"

export const ROLES = [
  "relationship_officer",
  "verification_officer",
  "credit_manager",
  "credit_analyst",
  "head_of_credit",
  "final_approver",
  "finance_officer",
  "auditor",
  "admin",
] as const

export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

export const ROLE_LABELS: Record<Role, string> = {
  relationship_officer: "Relationship Officer",
  verification_officer: "Verification Officer",
  credit_manager: "Credit Manager",
  credit_analyst: "Credit Analyst",
  head_of_credit: "Head of Credit",
  final_approver: "Final Approver",
  finance_officer: "Finance Officer",
  auditor: "Internal Auditor",
  admin: "System Administrator",
}

/** Roles that sit in an approval chain and land on "My Work" by default. */
export const APPROVER_ROLES: readonly Role[] = [
  "relationship_officer",
  "credit_manager",
  "credit_analyst",
  "head_of_credit",
  "final_approver",
]
