"use client"

import { useMemo } from "react"
import { useSession } from "@/features/auth/hooks/use-session"
import { useApplications, useMyWork } from "@/features/applications/hooks/use-applications"
import { can, canAny } from "@/lib/rbac/can"
import { NAV_GROUPS, type NavGroup } from "./nav"

export function useVisibleNav(): NavGroup[] {
  const session = useSession()
  return useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canAny(session, [i.permission].flat())) })).filter(
        (g) => g.items.length > 0,
      ),
    [session],
  )
}

/** Most specific nav item matching the path, for active state. */
export function isActivePath(pathname: string, href: string, allHrefs: string[]): boolean {
  if (pathname !== href && !pathname.startsWith(href + "/")) return false
  return !allHrefs.some(
    (h) => h !== href && h.startsWith(href + "/") && (pathname === h || pathname.startsWith(h + "/")),
  )
}

export interface NavCount {
  value: number
  /** Something is overdue — shown in red. */
  urgent: boolean
  label: string
}

/** Live counts for the sidebar, keyed by nav href. Only fetched for roles that can see the item. */
export function useNavCounts(): Record<string, NavCount> {
  const session = useSession()
  const approver = can(session, "approval:act")
  const finance = can(session, "handover:view")
  const { data: work } = useMyWork({ enabled: approver })
  const { data: handover } = useApplications({ status: ["offer_accepted"], pageSize: 5 }, { enabled: finance })

  const counts: Record<string, NavCount> = {}
  if (work) {
    const waiting = work.pending.length + work.delegated.length
    counts["/my-work"] = {
      value: waiting,
      urgent: work.overdue.length > 0,
      label: work.overdue.length ? `${waiting} waiting, ${work.overdue.length} overdue` : `${waiting} waiting for you`,
    }
  }
  if (handover)
    counts["/handover"] = { value: handover.total, urgent: false, label: `${handover.total} awaiting handover` }
  return counts
}
