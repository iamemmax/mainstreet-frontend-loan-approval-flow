import type { Role } from "./roles"

export const PERMISSIONS = [
  "application:view",
  "application:view_all",
  "application:create",
  "application:edit",
  "application:export",
  "verification:run",
  "verification:override",
  "assessment:edit",
  "approval:act",
  "approval:delegate",
  "offer:generate",
  "offer:send",
  "handover:view",
  "handover:export",
  "reports:view",
  "reports:export",
  "pii:reveal",
  "audit:view",
  "admin:users",
  "admin:branches",
  "admin:products",
  "admin:workflow",
  "admin:templates",
  "admin:notifications",
  "admin:integrations",
] as const

export type Permission = (typeof PERMISSIONS)[number]

// No "application:view_all": approvers see only what they own, worked on or must decide now.
const APPROVER_BASE: Permission[] = [
  "application:view",
  "approval:act",
  "approval:delegate",
  "reports:view",
  "pii:reveal",
]

/**
 * Default role → permission matrix. The admin permission-matrix screen edits
 * this at runtime; the mock API serves it so the UI never hard-codes it.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  relationship_officer: [
    "application:view",
    "application:create",
    "application:edit",
    "approval:act",
    "approval:delegate",
    "offer:generate",
    "offer:send",
    "pii:reveal",
    "reports:view",
  ],
  verification_officer: ["application:view", "verification:run", "verification:override", "pii:reveal", "reports:view"],
  credit_manager: [...APPROVER_BASE, "assessment:edit", "offer:generate", "offer:send"],
  credit_analyst: [...APPROVER_BASE, "assessment:edit"],
  head_of_credit: [...APPROVER_BASE, "reports:export", "audit:view", "application:export"],
  final_approver: [...APPROVER_BASE, "reports:export", "audit:view"],
  finance_officer: ["application:view", "handover:view", "handover:export", "reports:view"],
  auditor: [
    "application:view",
    "application:view_all",
    "application:export",
    "reports:view",
    "reports:export",
    "audit:view",
  ],
  admin: [
    "application:view",
    "application:view_all",
    "application:export",
    "reports:view",
    "reports:export",
    "audit:view",
    "admin:users",
    "admin:branches",
    "admin:products",
    "admin:workflow",
    "admin:templates",
    "admin:notifications",
    "admin:integrations",
  ],
}
