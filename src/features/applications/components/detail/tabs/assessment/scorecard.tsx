"use client"

import { cn } from "@/lib/utils"

/** Each factor as a bar from the left, its length the size of the points and its colour gained or lost. */
export function Scorecard({ factors }: { factors: { label: string; points: number; detail: string }[] }) {
  const max = Math.max(1, ...factors.map((f) => Math.abs(f.points)))
  return (
    <ul className="space-y-3">
      {factors.map((f) => {
        const width = `${(Math.abs(f.points) / max) * 100}%`
        return (
          <li key={f.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{f.label}</span>
              <span className={cn("tabular font-semibold", f.points >= 0 ? "text-success" : "text-destructive")}>
                {f.points > 0 ? `+${f.points}` : f.points}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", f.points >= 0 ? "bg-success" : "bg-destructive")}
                style={{ width }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{f.detail}</p>
          </li>
        )
      })}
      {factors.length === 0 && (
        <li className="text-sm text-muted-foreground">No factors yet — complete verification and the assessment.</li>
      )}
    </ul>
  )
}
