"use client"

import dynamic from "next/dynamic"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarList } from "@/features/reports/components/bar-list"
import { formatCount } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { DashboardSummary } from "../schemas/dashboard"

// Charts load on demand, so the rest of the dashboard isn't held up by the chart library.
const ActivityChart = dynamic(() => import("./activity-chart").then((m) => m.ActivityChart), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full" />,
})

type Charts = NonNullable<DashboardSummary["charts"]>

/** The team's two charts side by side: what it got through each month, and where its work stands now. */
export function TeamCharts({ charts, loading }: { charts?: Charts | null; loading: boolean }) {
  if (!loading && !charts) return null
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ActivityCard activity={charts?.activity} loading={loading} className="lg:col-span-2" />
      <BreakdownCard breakdown={charts?.breakdown} loading={loading} />
    </div>
  )
}

function ActivityCard({
  activity,
  loading,
  className,
}: {
  activity?: Charts["activity"]
  loading: boolean
  className?: string
}) {
  const total = activity?.months.reduce((sum, month) => sum + month.count, 0) ?? 0
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>{activity?.title ?? "Activity"}</CardTitle>
        <CardDescription>{activity?.description ?? "Each month"}</CardDescription>
        <CardAction className="text-right">
          {loading || !activity ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <>
              <div className="tabular text-lg font-semibold">{formatCount(total)}</div>
              <div className="text-xs text-muted-foreground">in 6 months</div>
            </>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading || !activity ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ActivityChart data={activity.months} unit={activity.unit} />
        )}
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ breakdown, loading }: { breakdown?: Charts["breakdown"]; loading: boolean }) {
  const total = breakdown?.rows.reduce((sum, row) => sum + row.count, 0) ?? 0
  return (
    <Card className={cn("gap-4")}>
      <CardHeader className="border-b">
        <CardTitle>{breakdown?.title ?? "Where things stand"}</CardTitle>
        <CardDescription>{breakdown?.description ?? "Right now"}</CardDescription>
        <CardAction className="text-right">
          {loading || !breakdown ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <>
              <div className="tabular text-lg font-semibold">{formatCount(total)}</div>
              <div className="text-xs text-muted-foreground">now</div>
            </>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <BarList
          loading={loading || !breakdown}
          rows={breakdown?.rows.map((row) => ({
            label: row.label,
            value: row.count,
            display: formatCount(row.count),
            tone: row.tone,
          }))}
          empty="Nothing here right now."
        />
      </CardContent>
    </Card>
  )
}
