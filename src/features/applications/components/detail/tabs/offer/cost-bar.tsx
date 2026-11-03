"use client"

import { formatNaira, formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { type OfferTerms } from "../../../../utils/offer"

/** Where the customer's money goes: principal, interest and upfront fees as one bar. */
export function CostBar({ terms }: { terms: OfferTerms }) {
  const total = terms.totalRepayable + terms.totalFees
  const parts = [
    { label: "Principal", value: terms.principal, className: "bg-primary" },
    { label: "Interest", value: terms.totalInterest, className: "bg-chart-2" },
    { label: "Fees", value: terms.totalFees, className: "bg-warning" },
  ]
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <div
            key={p.label}
            className={cn("h-full border-r-2 border-card last:border-r-0", p.className)}
            style={{ width: `${(p.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full", p.className)} />
            {p.label} <span className="tabular font-medium text-foreground">{formatPercent(p.value / total, 0)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function PriceRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3 px-4 py-2.5", strong && "bg-muted/40 font-semibold")}>
      <dt className={cn(!strong && "text-muted-foreground")}>{label}</dt>
      <dd className="tabular">
        {value < 0 ? "− " : ""}
        {formatNaira(Math.abs(value))}
      </dd>
    </div>
  )
}
