"use client"

import { UserRoundCheck } from "lucide-react"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { useMyDelegations } from "@/features/workflow/hooks/use-workflows"
import { formatDate } from "@/lib/format/date"

export function DelegationBanner({ userId }: { userId: string }) {
  const { data: delegations } = useMyDelegations()
  const { data: users } = useUsers()
  const now = new Date()
  const active = delegations?.filter((d) => new Date(d.startsAt) <= now && now <= new Date(d.endsAt))
  if (!active?.length || !users) return null
  return (
    <div className="space-y-2">
      {active.map((d) => {
        const incoming = d.toUserId === userId
        const other = users.find((u) => u.id === (incoming ? d.fromUserId : d.toUserId))?.name ?? "a colleague"
        return (
          <div
            key={d.id}
            className="flex items-start gap-3 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm"
          >
            <UserRoundCheck className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
            <div>
              <p className="font-medium">
                {incoming ? `You are covering approvals for ${other}` : `Your approvals are delegated to ${other}`}{" "}
                until {formatDate(d.endsAt, "EEE d MMM, HH:mm")}
              </p>
              <p className="text-muted-foreground">{d.reason}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
