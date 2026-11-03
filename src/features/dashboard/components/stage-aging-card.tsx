"use client"

import Link from "next/link"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount, formatNaira } from "@/lib/format/money"
import { setIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import type { DashboardSummary } from "../schemas/dashboard"
import { formatDays } from "./figures"

type Insights = NonNullable<DashboardSummary["insights"]>

/** Average days at each step for current applications, with the slowest step called out. */
export function StageAgingCard({
  insights,
  showTurnaround,
  loading,
  className,
}: {
  insights?: Insights | null
  showTurnaround: boolean
  loading: boolean
  className?: string
}) {
  const stages = insights?.stages ?? []
  const max = Math.max(1, ...stages.map((s) => s.avgDays ?? 0))
  const slowest = stages.reduce<Insights["stages"][number] | null>(
    (m, s) => (s.count && (s.avgDays ?? 0) > (m?.avgDays ?? 0) ? s : m),
    null,
  )
  const turnaround = insights?.turnaround
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>Where loans are waiting</CardTitle>
        <CardDescription>Average time current applications have spent at each step</CardDescription>
        {showTurnaround && turnaround && (
          <CardAction className="text-right">
            <div className="tabular text-lg font-semibold">
              {turnaround.days === null ? "—" : formatDays(turnaround.days)}
            </div>
            <div className="text-xs text-muted-foreground">turnaround, 30 days</div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loading || !insights ? (
          <div className="space-y-4">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {stages.map((s) => {
              const isSlowest = s.key === slowest?.key
              return (
                <li key={s.key}>
                  <Link
                    href="/applications"
                    onClick={() =>
                      setIntent("applications", {
                        filters: { status: s.statuses.join(",") },
                        sort: "updatedAt",
                        dir: "asc",
                      })
                    }
                    className="block rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    title={`${s.label}: ${formatCount(s.count)} · ${formatNaira(s.value, "full")}`}
                  >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{s.label}</span>
                        {isSlowest && (
                          <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                            Slowest
                          </span>
                        )}
                      </span>
                      <span className="tabular shrink-0 text-right">
                        <span className="font-medium">{s.avgDays === null ? "—" : formatDays(s.avgDays)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatCount(s.count)} · {formatNaira(s.value, "compact")}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", isSlowest ? "bg-warning" : "bg-chart-2")}
                        style={{ width: `${((s.avgDays ?? 0) / max) * 100}%` }}
                      />
                    </div>
                    {s.oldestDays !== null && s.oldestDays >= 1 && (
                      <div className="tabular mt-1 text-[11px] text-muted-foreground">
                        Oldest {formatDays(s.oldestDays)}
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
