"use client"

import { MoneyText } from "@/components/shared/money-text"
import { StatCard } from "@/components/shared/stat-card"
import { formatCount, formatPercent } from "@/lib/format/money"
import { setIntent } from "@/lib/navigation/intent"
import type { DashboardFigure } from "../schemas/dashboard"
import type { DashboardContext } from "./alerts"
import { FIGURE, formatDays } from "./figures"

function display(f: DashboardFigure) {
  const { format } = FIGURE[f.key]
  if (format === "limit") {
    if (f.value === null) return "No limit"
    if (f.value === 0) return "Review only"
    return <MoneyText value={f.value} format="compact" />
  }
  if (f.value === null) return "—"
  if (format === "money") return <MoneyText value={f.value} format="compact" />
  if (format === "days") return formatDays(f.value)
  if (format === "percent") return formatPercent(f.value)
  return formatCount(f.value)
}

/** Four figures chosen for the user's team; the server decides which. */
export function FigureRow({
  figures,
  ctx,
  loading,
}: {
  figures?: DashboardFigure[]
  ctx: DashboardContext
  loading: boolean
}) {
  return (
    <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {loading || !figures
        ? Array.from({ length: 4 }, (_, i) => <StatCard key={i} label=" " value={null} loading />)
        : figures.map((f) => {
            const def = FIGURE[f.key]
            const link = def.link?.(ctx)
            const delta = f.value !== null && f.previous ? (f.value - f.previous) / f.previous : undefined
            return (
              <StatCard
                key={f.key}
                label={def.label}
                value={display(f)}
                tone={f.tone}
                hint={f.note ?? undefined}
                delta={delta}
                deltaLabel="vs previous 30 days"
                deltaIntent={def.increaseIsBad ? "increase_is_bad" : "increase_is_good"}
                href={link?.href}
                onNavigate={link?.intent ? () => setIntent("applications", link.intent!) : undefined}
              />
            )
          })}
    </section>
  )
}
