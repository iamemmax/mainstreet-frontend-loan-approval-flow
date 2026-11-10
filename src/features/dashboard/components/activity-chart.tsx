"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"
import { formatCount, formatNaira } from "@/lib/format/money"

export interface ActivityPoint {
  month: string
  label: string
  count: number
  /** Kobo. */
  value: number
}

function ActivityTooltip({ active, payload, unit }: Partial<TooltipContentProps<number, string>> & { unit: string }) {
  const point = payload?.[0]?.payload as ActivityPoint | undefined
  if (!active || !point) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{point.label}</div>
      <div className="tabular mt-1 text-sm font-semibold">
        {formatCount(point.count)} {point.count === 1 ? unit.replace(/s$/, "") : unit}
      </div>
      <div className="tabular text-muted-foreground">{formatNaira(point.value, "compact")}</div>
    </div>
  )
}

/** How many a team got through each month, as columns. One series, so the card title names it and there's no legend. */
export function ActivityChart({ data, unit }: { data: ActivityPoint[]; unit: string }) {
  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={data.map((point) => `${point.label}: ${formatCount(point.count)} ${unit}`).join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis
            width={32}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip content={<ActivityTooltip unit={unit} />} cursor={{ fill: "var(--color-muted)", radius: 6 }} />
          <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
