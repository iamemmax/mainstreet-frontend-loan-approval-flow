"use client"

import { Download } from "lucide-react"
import { useState } from "react"
import { Can } from "@/components/shared/can"
import { MoneyText } from "@/components/shared/money-text"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDays } from "@/features/dashboard/components/figures"
import { downloadCsv } from "@/lib/export/csv"
import { formatDate } from "@/lib/format/date"
import { formatCount, formatNaira, formatPercent, koboToNaira } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { ManagementReport as Report, PerformanceRow } from "../schemas/reports"
import { BarList } from "./bar-list"

const DIMENSIONS = { byBranch: "Branch", byProduct: "Product", byOfficer: "Officer", byAgent: "Agent" } as const
type Dimension = keyof typeof DIMENSIONS

const FUNNEL_LABELS: Record<Report["funnel"][number]["key"], string> = {
  submitted: "Submitted",
  verified: "Passed verification",
  approval: "Reached approval",
  approved: "Approved",
  offer_sent: "Offer sent",
  accepted: "Accepted by customer",
  handed_over: "Handed to finance",
}

const STEP_LABELS: Record<Report["stepTimes"][number]["key"], { label: string; detail: string }> = {
  verification: { label: "Verification", detail: "Submission to verified" },
  assessment_approval: { label: "Assessment and approval", detail: "Verified to final approval" },
  acceptance: { label: "Customer acceptance", detail: "Offer sent to accepted" },
  handover: { label: "Handover", detail: "Accepted to handed to finance" },
}

function rate(r: { approved: number; rejected: number }) {
  const d = r.approved + r.rejected
  return d ? r.approved / d : null
}

export function ManagementReport({ data, loading }: { data?: Report; loading: boolean }) {
  const t = data?.totals
  return (
    <>
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applied"
          loading={loading}
          value={t && <MoneyText value={t.applied.value} format="compact" />}
          hint={t && `${formatCount(t.applied.count)} applications submitted`}
        />
        <StatCard
          label="Approved"
          loading={loading}
          value={t && <MoneyText value={t.approved.value} format="compact" />}
          hint={
            t &&
            `${formatCount(t.approved.count)} approved · ${rate({ approved: t.approved.count, rejected: t.rejected }) === null ? "—" : formatPercent(rate({ approved: t.approved.count, rejected: t.rejected })!)} approval rate`
          }
        />
        <StatCard
          label="Accepted by customers"
          loading={loading}
          value={t && <MoneyText value={t.accepted.value} format="compact" />}
          hint={t && `${formatCount(t.accepted.count)} offers accepted`}
        />
        <StatCard
          label="Median turnaround"
          loading={loading}
          value={t && (t.medianTurnaroundDays === null ? "—" : formatDays(t.medianTurnaroundDays))}
          hint="Submission to accepted offer"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Where applications drop out</CardTitle>
            <CardDescription>Applications submitted in this period and how far they got</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              loading={loading}
              rows={data?.funnel.map((f) => ({
                label: FUNNEL_LABELS[f.key],
                value: f.count,
                display: formatCount(f.count),
                detail: data.funnel[0].count ? formatPercent(f.count / data.funnel[0].count, 0) : "—",
              }))}
              max={data?.funnel[0]?.count}
              empty="No applications were submitted in this period."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>How long each step takes</CardTitle>
            <CardDescription>Median days, for steps finished in this period</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              loading={loading}
              highlightMax
              rows={data?.stepTimes.map((s) => ({
                label: STEP_LABELS[s.key].label,
                value: s.medianDays ?? 0,
                display: s.medianDays === null ? "—" : formatDays(s.medianDays),
                detail: `${STEP_LABELS[s.key].detail} · ${formatCount(s.count)}`,
              }))}
              empty="No steps were finished in this period."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Rejection reasons</CardTitle>
            <CardDescription>Why applications in this period were declined</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              loading={loading}
              rows={data?.rejectionReasons.map((r) => ({
                label: r.label,
                value: r.count,
                display: formatCount(r.count),
              }))}
              empty="No rejections in this period."
            />
          </CardContent>
        </Card>
        <PerformanceCard data={data} loading={loading} className="lg:col-span-2" />
      </div>
    </>
  )
}

function PerformanceCard({ data, loading, className }: { data?: Report; loading: boolean; className?: string }) {
  const [dim, setDim] = useState<Dimension>("byBranch")
  const exportCsv = () => {
    if (!data) return
    downloadCsv(
      `performance-by-${DIMENSIONS[dim].toLowerCase()}-${formatDate(new Date(), "yyyy-MM-dd")}.csv`,
      [
        DIMENSIONS[dim],
        "Applications",
        "Value (NGN)",
        "Approved",
        "Rejected",
        "Approval rate",
        "Ready for disbursement (NGN)",
      ],
      data[dim].map((r) => [
        r.name,
        r.count,
        koboToNaira(r.value),
        r.approved,
        r.rejected,
        rate(r) ?? "",
        koboToNaira(r.disbursedValue),
      ]),
    )
  }
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="gap-3 border-b sm:flex sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Performance</CardTitle>
          <CardDescription>Volume and outcomes by {DIMENSIONS[dim].toLowerCase()}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={dim} onValueChange={(v) => setDim(v as Dimension)}>
            <TabsList>
              {(Object.keys(DIMENSIONS) as Dimension[]).map((k) => (
                <TabsTrigger key={k} value={k}>
                  {DIMENSIONS[k]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Can permission="reports:export">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
              <Download aria-hidden /> Export
            </Button>
          </Can>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {loading || !data ? (
          <div className="px-6">
            <BarList loading />
          </div>
        ) : data[dim].length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No applications in this period.</p>
        ) : (
          <PerformanceTable rows={data[dim]} label={DIMENSIONS[dim]} />
        )}
      </CardContent>
    </Card>
  )
}

function PerformanceTable({ rows, label }: { rows: PerformanceRow[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <Table aria-label={`Performance by ${label}`}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-6">{label}</TableHead>
          <TableHead className="text-right">Applications</TableHead>
          <TableHead>Value</TableHead>
          <TableHead className="hidden text-right md:table-cell">Approved</TableHead>
          <TableHead className="hidden text-right md:table-cell">Rejected</TableHead>
          <TableHead className="px-6 text-right">Approval rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const ratio = rate(r)
          return (
            <TableRow key={r.id}>
              <TableCell className="px-6 font-medium">{r.name}</TableCell>
              <TableCell className="tabular text-right">{formatCount(r.count)}</TableCell>
              <TableCell className="min-w-40">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-chart-2" style={{ width: `${(r.value / max) * 100}%` }} />
                  </div>
                  <span className="tabular w-16 text-right text-xs">{formatNaira(r.value, "compact")}</span>
                </div>
              </TableCell>
              <TableCell className="tabular hidden text-right md:table-cell">{formatCount(r.approved)}</TableCell>
              <TableCell className="tabular hidden text-right md:table-cell">{formatCount(r.rejected)}</TableCell>
              <TableCell className="tabular px-6 text-right">{ratio === null ? "—" : formatPercent(ratio)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
