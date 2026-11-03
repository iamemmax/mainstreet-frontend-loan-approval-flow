"use client"

import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { DTI_LIMIT } from "../../../../utils/scorecard"

/** Debt-to-income on a 0–80% track with the policy limit marked. */
export function DtiMeter({ dti }: { dti: number | null }) {
  const max = 0.8
  const pct = dti === null ? 0 : Math.min(dti, max) / max
  return (
    <div className="space-y-1">
      <div className="relative h-1.5 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", dti !== null && dti > DTI_LIMIT ? "bg-destructive" : "bg-success")}
          style={{ width: `${pct * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-foreground/60"
          style={{ left: `${(DTI_LIMIT / max) * 100}%` }}
        />
      </div>
      <div className="relative h-3 text-[11px] text-muted-foreground">
        <span className="absolute -translate-x-1/2" style={{ left: `${(DTI_LIMIT / max) * 100}%` }}>
          {formatPercent(DTI_LIMIT, 0)} limit
        </span>
      </div>
    </div>
  )
}
