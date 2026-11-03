import { type Role, ROLES } from "@/lib/rbac/roles"

/** Roles that can sit on an approval stage. */
export const STAGE_ROLES: readonly Role[] = ROLES.filter((r) => !["admin", "auditor", "finance_officer"].includes(r))
