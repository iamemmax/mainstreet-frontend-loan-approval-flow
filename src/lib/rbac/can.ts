import type { Permission } from "./permissions"

export interface PermissionSubject {
  permissions: readonly Permission[]
}

export function can(subject: PermissionSubject | null | undefined, permission: Permission): boolean {
  return !!subject && subject.permissions.includes(permission)
}

export function canAny(subject: PermissionSubject | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(subject, p))
}
