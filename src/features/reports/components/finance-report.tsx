"use client"

import { Download } from "lucide-react"
import { useState } from "react"
import { Can } from "@/components/shared/can"
import { MoneyText } from "@/components/shared/money-text"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDays } from "@/features/dashboard/components/figures"
import { VolumeChart } from "@/features/dashboard/components/volume-chart"
import { downloadCsv } from "@/lib/export/csv"
import { formatDate } from "@/lib/format/date"
import { formatCount, formatNaira, koboToNaira } from "@/lib/format/money"
import type { FinanceReport as Report } from "../schemas/reports"
import { BarList } from "./bar-list"

const DIMENSIONS = { byBranch: "Branch", byProduct: "Product" } as const
type Dimension = keyof typeof DIMENSIONS

/** What finance has taken over for disbursement in the period. */
export function FinanceReport({ data, loading }: { data?: Report; loading: boolean }) {
  const [dim, setDim] = useState<Dimension>("byBranch")
  const t = data?.totals
  const exportCsv = () => {
    if (!data) return
    downloadCsv(
      `handover-by-${DIMENSIONS[dim].toLowerCase()}-${formatDate(new Date(), "yyyy-MM-dd")}.csv`,
      [DIMENSIONS[dim], "Loans handed over", "Value (NGN)"],
      data[dim].map((r) => [r.name, r.count, koboToNaira(r.value)]),
    )
  }
  return (
    <>
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Handed over"
          loading={loading}
          value={t && <MoneyText value={t.handedOver.value} format="compact" />}
          hint={t && `${formatCount(t.handedOver.count)} loans`}
        />
        <StatCard
          label="Time to hand over"
          loading={loading}
          value={t && (t.medianHandoverDays === null ? "—" : formatDays(t.medianHandoverDays))}
          hint="Median, acceptance to handover"
        />
        <StatCard
          label="Average loan"
          loading={loading}
          value={t && (t.averageLoan === null ? "—" : <MoneyText value={t.averageLoan} format="compact" />)}
          hint="Of loans handed over"
        />
        <StatCard
          label="Waiting now"
          loading={loading}
          value={t && <MoneyText value={t.waiting.value} format="compact" />}
          hint={t && `${formatCount(t.waiting.count)} accepted, not yet handed over`}
          href="/handover"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Handed over by month</CardTitle>
            <CardDescription>Value passed to finance, last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? <Skeleton className="h-64 w-full" /> : <VolumeChart data={data.monthly} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>By {DIMENSIONS[dim].toLowerCase()}</CardTitle>
              <Can permission="handover:export">
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
                  <Download aria-hidden /> Export
                </Button>
              </Can>
            </div>
            <Tabs value={dim} onValueChange={(v) => setDim(v as Dimension)}>
              <TabsList>
                {(Object.keys(DIMENSIONS) as Dimension[]).map((k) => (
                  <TabsTrigger key={k} value={k}>
                    {DIMENSIONS[k]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <BarList
              loading={loading}
              rows={data?.[dim].map((r) => ({
                label: r.name,
                value: r.value,
                display: formatNaira(r.value, "compact"),
                detail: `${formatCount(r.count)} ${r.count === 1 ? "loan" : "loans"}`,
              }))}
              empty="Nothing handed over in this period."
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
