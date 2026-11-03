import type { Permission } from "./permissions"

/**
 * Route prefix → permissions that open it (any one is enough). Used by
 * middleware and by navigation so the two can never disagree. Longest
 * matching prefix wins.
 */
export const ROUTE_PERMISSIONS: ReadonlyArray<[prefix: string, permission: Permission | Permission[]]> = [
  ["/dashboard", "application:view"],
  ["/my-work", "approval:act"],
  ["/applications/new", "application:create"],
  ["/applications", "application:view"],
  ["/handover", "handover:view"],
  ["/reports", "reports:view"],
  ["/admin/users", "admin:users"],
  ["/admin/roles", "admin:users"],
  ["/admin/branches", "admin:branches"],
  ["/admin/products", "admin:products"],
  ["/admin/workflows", "admin:workflow"],
  ["/admin/templates", "admin:templates"],
  ["/admin/notifications", "admin:notifications"],
  ["/admin/integrations", "admin:integrations"],
  ["/admin/audit", "audit:view"],
]

export function requiredPermissionFor(pathname: string): Permission[] | null {
  let match: (typeof ROUTE_PERMISSIONS)[number] | null = null
  for (const entry of ROUTE_PERMISSIONS) {
    const [prefix] = entry
    if ((pathname === prefix || pathname.startsWith(prefix + "/")) && (!match || prefix.length > match[0].length)) {
      match = entry
    }
  }
  return match ? [match[1]].flat() : null
}
