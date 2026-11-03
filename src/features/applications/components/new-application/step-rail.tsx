"use client"

import { Check } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { FORM_HEADER } from "./fields"
import { STEPS } from "./steps"

interface StepRailProps {
  step: number
  /** The furthest step reached; anything up to it can be revisited. */
  furthest: number
  onStep: (index: number) => void
  /** What's been captured so far, shown under the steps. */
  summary: { label: string; value: ReactNode }[]
  className?: string
}

/** The left-hand guide: progress, every step with its state, and a running summary. */
export function StepRail({ step, furthest, onStep, summary, className }: StepRailProps) {
  const pct = Math.round((step / (STEPS.length - 1)) * 100)
  return (
    <aside
      aria-label="Application steps"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]",
        className,
      )}
    >
      <div className={cn(FORM_HEADER, "shrink-0 bg-gradient-to-b from-primary/[0.05] to-transparent px-5")}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">
            Step {step + 1} <span className="font-normal text-muted-foreground">of {STEPS.length}</span>
          </span>
          <span className="tabular text-xs font-medium text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>

      {/* Steps share the height between header and summary; each connector runs to the next circle. */}
      <ol className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5 [scrollbar-width:thin]">
        {STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          const reachable = i <= furthest
          return (
            <li key={s.id} className="relative flex-1">
              {/* Connector to the next step; fills in as steps are completed. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-[2.5rem] bottom-[-0.625rem] left-[calc(0.75rem+0.9375rem-1px)] w-0.5 overflow-hidden bg-border"
                >
                  <span
                    className={cn(
                      "block w-full bg-success transition-[height] duration-500 ease-out",
                      done ? "h-full" : "h-0",
                    )}
                  />
                </span>
              )}
              <button
                type="button"
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                onClick={() => onStep(i)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
                  current ? "bg-primary/[0.06]" : reachable && "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex size-[1.875rem] shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                    done && "bg-success text-white",
                    current && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !done && !current && "border bg-card text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-4 duration-300 animate-in zoom-in-50" strokeWidth={3} aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn("block text-sm font-medium", !reachable && "text-muted-foreground")}>
                    {s.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {summary.length > 0 && (
        <dl className="shrink-0 space-y-2 border-t bg-muted/30 px-5 py-4 text-[13px]">
          {summary.map((r) => (
            <div key={r.label} className="flex justify-between gap-3 duration-300 animate-in fade-in">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="truncate text-right font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}

/** Small screens: a compact progress bar instead of the full rail. */
export function StepProgress({ step }: { step: number }) {
  const s = STEPS[step]
  return (
    <div className="rounded-2xl border border-border/80 bg-card px-4 py-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{s.label}</span>
        <span className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {STEPS.map((x, i) => (
          <span
            key={x.id}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  )
}
