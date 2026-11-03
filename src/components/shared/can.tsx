"use client"

import type { ReactNode } from "react"
import { useSession } from "@/features/auth/hooks/use-session"
import { can } from "@/lib/rbac/can"
import type { Permission } from "@/lib/rbac/permissions"

interface CanProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

/** Renders children only if the signed-in user holds `permission`. */
export function Can({ permission, children, fallback = null }: CanProps) {
  return can(useSession(), permission) ? children : fallback
}
