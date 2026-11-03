"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Search } from "lucide-react"
import { useState } from "react"
import { ErrorState } from "@/components/shared/empty-state"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { initials } from "@/lib/format/name"
import { ROLE_LABELS, ROLES } from "@/lib/rbac/roles"
import { authKeys, fetchDemoUsers } from "../../api/session"
import type { User } from "../../types"

/** Step 1: pick the staff account, grouped by role, with a quick search. */
export function AccountStep({ onSelect }: { onSelect: (user: User) => void }) {
  const { data: users, isPending, error, refetch } = useQuery({ queryKey: authKeys.demoUsers, queryFn: fetchDemoUsers })
  const [q, setQ] = useState("")

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  const needle = q.trim().toLowerCase()
  const shown = users.filter(
    (u) => !needle || `${u.name} ${u.email} ${u.staffId} ${ROLE_LABELS[u.role]}`.toLowerCase().includes(needle),
  )

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or staff ID"
          aria-label="Search staff accounts"
          className="pl-10"
          autoFocus
        />
      </div>
      {shown.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">No staff account matches &ldquo;{q}&rdquo;.</p>
      )}
      {ROLES.map((role) => {
        const members = shown.filter((u) => u.role === role)
        if (!members.length) return null
        return (
          <section key={role} aria-labelledby={`role-${role}`} className="space-y-2">
            <h3
              id={`role-${role}`}
              className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
            >
              {ROLE_LABELS[role]}
            </h3>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {members.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(u)}
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{u.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {u.email}
                        {u.status === "away" && " · Away (delegated)"}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
