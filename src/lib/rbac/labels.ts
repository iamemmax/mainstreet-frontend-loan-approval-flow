import type { Permission } from "./permissions"

/** Permission groups as shown on the roles matrix and a user's profile. */
export const PERMISSION_GROUPS: { label: string; prefix: string }[] = [
  { label: "Applications", prefix: "application:" },
  { label: "Verification & assessment", prefix: "verification:|assessment:" },
  { label: "Approvals & offers", prefix: "approval:|offer:" },
  { label: "Finance & reporting", prefix: "handover:|reports:" },
  { label: "Data & audit", prefix: "pii:|audit:" },
  { label: "Administration", prefix: "admin:" },
]

export const PERMISSION_LABELS: Record<Permission, string> = {
  "application:view": "View applications",
  "application:view_all": "See every application (oversight)",
  "application:create": "Create",
  "application:edit": "Edit",
  "application:export": "Export",
  "verification:run": "Run verification",
  "verification:override": "Override result",
  "assessment:edit": "Edit assessment",
  "approval:act": "Decide approvals",
  "approval:delegate": "Delegate approvals",
  "offer:generate": "Generate offer",
  "offer:send": "Send offer",
  "handover:view": "Handover queue",
  "handover:export": "Export handover",
  "reports:view": "View reports",
  "reports:export": "Export reports",
  "pii:reveal": "Reveal BVN / NIN",
  "audit:view": "View audit log",
  "admin:users": "Users & roles",
  "admin:branches": "Branches",
  "admin:products": "Products",
  "admin:workflow": "Workflows",
  "admin:templates": "Templates",
  "admin:notifications": "Notifications",
  "admin:integrations": "Integrations",
}
