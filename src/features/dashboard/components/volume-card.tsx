"use client"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNaira } from "@/lib/format/money"
import type { DashboardSummary } from "../schemas/dashboard"
import { VolumeChart } from "./volume-chart"

type Monthly = NonNullable<DashboardSummary["insights"]>["monthly"]

export function VolumeCard({
  monthly,
  loading,
  className,
}: {
  monthly?: Monthly
  loading: boolean
  className?: string
}) {
  const total = monthly?.reduce((t, m) => t + m.value, 0) ?? 0
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>Application volume</CardTitle>
        <CardDescription>Value of loans submitted, last 6 months</CardDescription>
        <CardAction className="text-right">
          {loading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <>
              <div className="tabular text-lg font-semibold">{formatNaira(total, "compact")}</div>
              <div className="text-xs text-muted-foreground">total</div>
            </>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading || !monthly ? <Skeleton className="h-64 w-full" /> : <VolumeChart data={monthly} />}
      </CardContent>
    </Card>
  )
}
