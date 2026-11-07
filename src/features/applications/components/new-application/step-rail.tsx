"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { FORM_HEADER } from "./fields"
import { stepsFor } from "./steps"

interface StepRailProps {
  segment: "retail" | "sme"
  step: number
  /** The furthest step reached; anything up to it can be revisited. */
  furthest: number
  onStep: (index: number) => void
  className?: string
}

/** The left-hand guide: progress and every step with its state, as tall as the form beside it. */
export function StepRail({ segment, step, furthest, onStep, className }: StepRailProps) {
  const steps = stepsFor(segment)
  const pct = Math.round((step / (steps.length - 1)) * 100)
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
            Step {step + 1} <span className="font-normal text-muted-foreground">of {steps.length}</span>
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

      {/* Steps share the height below the header; each connector runs to the next circle. */}
      <ol className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5 [scrollbar-width:thin]">
        {steps.map((s, i) => {
          const done = i < step
          const current = i === step
          const reachable = i <= furthest
          return (
            <li key={s.id} className="relative flex-1">
              {/* Connector to the next step; fills in as steps are completed. */}
              {i < steps.length - 1 && (
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
    </aside>
  )
}

/** Small screens: a compact progress bar instead of the full rail. */
export function StepProgress({ segment, step }: { segment: "retail" | "sme"; step: number }) {
  const steps = stepsFor(segment)
  const s = steps[step]
  return (
    <div className="rounded-2xl border border-border/80 bg-card px-4 py-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{s.label}</span>
        <span className="text-xs text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((x, i) => (
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
