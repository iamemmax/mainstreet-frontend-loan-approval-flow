import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type BarTone = "neutral" | "success" | "warning" | "danger"

export interface BarRow {
  label: string
  value: number
  display: ReactNode
  detail?: ReactNode
  tone?: BarTone
}

const BAR: Record<BarTone, string> = {
  neutral: "bg-chart-2",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
}

/** Labelled horizontal bars. `highlightMax` colours the largest one, e.g. the slowest step. */
export function BarList({
  rows,
  loading,
  max,
  highlightMax,
  empty = "Nothing to show.",
}: {
  rows?: BarRow[]
  loading?: boolean
  max?: number
  highlightMax?: boolean
  empty?: string
}) {
  if (loading || !rows) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }
  if (rows.length === 0 || rows.every((r) => r.value === 0))
    return <p className="text-sm text-muted-foreground">{empty}</p>
  const top = Math.max(1, max ?? 0, ...rows.map((r) => r.value))
  const largest = Math.max(...rows.map((r) => r.value))
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const hot = highlightMax && r.value === largest && largest > 0
        return (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{r.label}</span>
                {hot && (
                  <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    Slowest
                  </span>
                )}
              </span>
              <span className="tabular shrink-0 font-medium">{r.display}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", hot ? "bg-warning" : BAR[r.tone ?? "neutral"])}
                style={{ width: `${(r.value / top) * 100}%` }}
              />
            </div>
            {r.detail && <div className="tabular mt-1 text-[11px] text-muted-foreground">{r.detail}</div>}
          </li>
        )
      })}
    </ul>
  )
}
