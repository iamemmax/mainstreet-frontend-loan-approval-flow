"use client"

import { useQuery } from "@tanstack/react-query"
import { createContext, useContext, type ReactNode } from "react"
import { can } from "@/lib/rbac/can"
import type { Permission } from "@/lib/rbac/permissions"
import { authKeys, fetchSession } from "../api/session"
import type { Session } from "../types"

export function useSessionQuery() {
  return useQuery({ queryKey: authKeys.session, queryFn: fetchSession, staleTime: 5 * 60_000 })
}

const SessionContext = createContext<Session | null>(null)

/** Provided by the staff layout once a session is confirmed. */
export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error("useSession must be used inside the staff layout")
  return session
}

export function useCan(permission: Permission): boolean {
  return can(useSession(), permission)
}
