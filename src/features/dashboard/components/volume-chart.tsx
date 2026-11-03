"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"
import { formatCount, formatNaira } from "@/lib/format/money"

interface MonthPoint {
  month: string
  label: string
  count: number
  value: number
}

function VolumeTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const p = payload?.[0]?.payload as MonthPoint | undefined
  if (!active || !p) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{p.label}</div>
      <div className="tabular mt-1 text-sm font-semibold">{formatNaira(p.value, "compact")}</div>
      <div className="tabular text-muted-foreground">{formatCount(p.count)} applications</div>
    </div>
  )
}

/** Value of applications submitted per month. Single series, so no legend: the card title names it. */
export function VolumeChart({ data }: { data: MonthPoint[] }) {
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={data.map((d) => `${d.label}: ${formatNaira(d.value, "compact")}`).join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="volume-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={56}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--color-muted-foreground)"
            tickFormatter={(v: number) => formatNaira(v, "compact")}
          />
          <Tooltip
            content={<VolumeTooltip />}
            cursor={{ stroke: "var(--color-muted-foreground)", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-chart-2)"
            strokeWidth={2}
            fill="url(#volume-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
