import { Check, X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StepState = "complete" | "current" | "upcoming" | "error"

export interface StepItem {
  id: string
  label: string
  description?: ReactNode
  state: StepState
}

interface StepperProps {
  steps: StepItem[]
  orientation?: "horizontal" | "vertical"
  /** Makes completed steps clickable (e.g. to jump back in a form). */
  onStepClick?: (id: string) => void
  className?: string
  "aria-label"?: string
}

const CIRCLE: Record<StepState, string> = {
  complete: "border-primary bg-primary text-primary-foreground",
  current: "border-primary bg-background text-primary ring-4 ring-primary/15",
  upcoming: "border-border bg-background text-muted-foreground",
  error: "border-destructive bg-destructive text-destructive-foreground",
}

export function Stepper({ steps, orientation = "horizontal", onStepClick, className, ...rest }: StepperProps) {
  const vertical = orientation === "vertical"
  return (
    <nav aria-label={rest["aria-label"] ?? "Progress"} className={className}>
      <ol className={cn("flex", vertical ? "flex-col gap-0" : "items-start gap-2 overflow-x-auto pb-1")}>
        {steps.map((step, i) => {
          const last = i === steps.length - 1
          const clickable = !!onStepClick && step.state === "complete"
          const content = (
            <>
              <span
                className={cn(
                  "tabular flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  CIRCLE[step.state],
                )}
              >
                {step.state === "complete" ? (
                  <Check className="size-3.5" aria-hidden />
                ) : step.state === "error" ? (
                  <X className="size-3.5" aria-hidden />
                ) : (
                  i + 1
                )}
              </span>
              <span className={cn("min-w-0", vertical ? "pb-6" : "")}>
                <span className={cn("block text-sm font-medium", step.state === "upcoming" && "text-muted-foreground")}>
                  {step.label}
                </span>
                {step.description && <span className="block text-xs text-muted-foreground">{step.description}</span>}
              </span>
            </>
          )
          return (
            <li
              key={step.id}
              aria-current={step.state === "current" ? "step" : undefined}
              className={cn("relative flex", vertical ? "gap-3" : "min-w-36 flex-1 flex-col gap-2")}
            >
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bg-border",
                    vertical ? "top-8 bottom-1 left-3.5 w-px" : "top-3.5 right-2 left-9 h-px",
                    step.state === "complete" && "bg-primary",
                  )}
                />
              )}
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  className={cn(
                    "flex rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    vertical ? "gap-3" : "flex-col gap-2",
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className={cn("flex", vertical ? "gap-3" : "flex-col gap-2")}>{content}</div>
              )}
              <span className="sr-only">
                {step.state === "complete"
                  ? "Completed"
                  : step.state === "current"
                    ? "Current step"
                    : step.state === "error"
                      ? "Has errors"
                      : "Not started"}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
