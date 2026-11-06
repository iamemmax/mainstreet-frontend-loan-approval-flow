"use client"

import { MoneyText } from "@/components/shared/money-text"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDays } from "@/features/dashboard/components/figures"
import { formatCount, formatPercent } from "@/lib/format/money"
import type { PersonalReport as Report } from "../schemas/reports"
import { BarList } from "./bar-list"

const FIGURE: Record<
  Report["figures"][number]["key"],
  { label: string; format: "count" | "money" | "days" | "percent" }
> = {
  submitted: { label: "Applications submitted", format: "count" },
  approved: { label: "Approved", format: "count" },
  returned: { label: "Returned to you", format: "count" },
  accepted: { label: "Accepted by customers", format: "money" },
  verified: { label: "Files verified", format: "count" },
  verification_time: { label: "Time to verify", format: "days" },
  checks_flagged: { label: "Files with flagged checks", format: "count" },
  rejected_at_verification: { label: "Declined at verification", format: "count" },
  assessed: { label: "Files assessed", format: "count" },
  assessment_time: { label: "Time to assess", format: "days" },
  decisions: { label: "Approval decisions", format: "count" },
  recommendation_match: { label: "Final decision matched you", format: "percent" },
}

function display(f: Report["figures"][number]) {
  if (f.value === null) return "—"
  const { format } = FIGURE[f.key]
  if (format === "money") return <MoneyText value={f.value} format="compact" />
  if (format === "days") return formatDays(f.value)
  if (format === "percent") return formatPercent(f.value, 0)
  return formatCount(f.value)
}

/** The four headline numbers of one person's own work. */
export function PersonalFigures({ data, loading }: { data?: Report; loading: boolean }) {
  return (
    <section aria-label="My performance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {loading || !data
        ? Array.from({ length: 4 }, (_, i) => <StatCard key={i} label=" " value={null} loading />)
        : data.figures.map((f) => (
            <StatCard key={f.key} label={FIGURE[f.key].label} value={display(f)} hint={f.note ?? undefined} />
          ))}
    </section>
  )
}

/** One person's own work in the period: nobody else's numbers. */
export function PersonalReport({ data, loading }: { data?: Report; loading: boolean }) {
  return (
    <>
      <PersonalFigures data={data} loading={loading} />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{data?.breakdown.title ?? "Breakdown"}</CardTitle>
          {data && <CardDescription>{data.breakdown.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <BarList
            loading={loading}
            rows={data?.breakdown.rows.map((r) => ({
              label: r.label,
              value: r.count,
              display: formatCount(r.count),
              tone: r.tone,
            }))}
            empty="Nothing recorded in this period."
          />
        </CardContent>
      </Card>
    </>
  )
}
