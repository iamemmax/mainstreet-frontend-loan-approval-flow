"use client"

import { Copy } from "lucide-react"
import { EmptyState, ErrorState } from "@/components/shared/empty-state"
import { Timeline } from "@/components/shared/timeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuditEvents } from "@/features/audit/hooks/use-audit-events"

export function ActivityTab({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useAuditEvents({ entityId: id, pageSize: 100 })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>The immutable audit trail for this application</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} size="sm" />
        ) : isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : data.items.length === 0 ? (
          <EmptyState size="sm" icon={<Copy aria-hidden />} title="No activity recorded" />
        ) : (
          <Timeline
            items={data.items.map((e) => ({
              id: e.id,
              at: e.at,
              title: e.summary.charAt(0).toUpperCase() + e.summary.slice(1),
              actor: e.actorName,
              tone: activityTone(e.action),
            }))}
          />
        )}
      </CardContent>
    </Card>
  )
}

/** Rejections red, approvals and acceptances green, everything else neutral. */
function activityTone(action: string): "danger" | "success" | "neutral" {
  if (action.includes("reject")) return "danger"
  if (action.includes("approve") || action.includes("accepted")) return "success"
  return "neutral"
}
