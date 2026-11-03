import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { TONE_TEXT, type Tone } from "./tone"

interface StatCardProps {
  label: string
  value: ReactNode
  /** Footnote under the value. Join parts with <StatMeta>. */
  hint?: ReactNode
  /** Colours the value when the number itself carries a status; keep "neutral" otherwise. */
  tone?: Tone
  /** Ratio change vs previous period, e.g. 0.12 = +12%. */
  delta?: number
  /** Whether an increase is good (green) or bad (red). */
  deltaIntent?: "increase_is_good" | "increase_is_bad"
  /** What the delta compares against, e.g. "vs last month". */
  deltaLabel?: string
  /** Makes the whole card a link to the underlying list. */
  href?: string
  /** Runs just before navigating, e.g. to hand filters to the list. */
  onNavigate?: () => void
  loading?: boolean
  className?: string
}

/** Footnote parts separated by a dot: "251 in progress • ₦1.6B". */
export function StatMeta({ parts }: { parts: ReactNode[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />}
          {p}
        </span>
      ))}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  delta,
  deltaIntent = "increase_is_good",
  deltaLabel,
  href,
  onNavigate,
  loading,
  className,
}: StatCardProps) {
  const flat = delta !== undefined && Math.abs(delta) < 0.0005
  const positive = delta !== undefined && delta > 0
  const good = deltaIntent === "increase_is_good" ? positive : !positive
  let DeltaIcon = ArrowDownRight
  if (flat) DeltaIcon = Minus
  else if (positive) DeltaIcon = ArrowUpRight

  const body = (
    <>
      <span className="text-[15px] text-muted-foreground">{label}</span>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-9 w-32" />
          <Skeleton className="mt-3 h-4 w-40" />
        </>
      ) : (
        <>
          <div
            className={cn(
              "tabular mt-2 text-[2rem] leading-tight font-bold tracking-tight",
              tone !== "neutral" && TONE_TEXT[tone],
            )}
          >
            {value}
          </div>
          {(hint || delta !== undefined) && (
            <div
              className={cn(
                "mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]",
                tone !== "neutral" ? TONE_TEXT[tone] : "text-muted-foreground",
              )}
            >
              {delta !== undefined && (
                <span
                  className={cn(
                    "tabular inline-flex items-center gap-0.5 font-semibold",
                    flat ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
                  )}
                >
                  <DeltaIcon className="size-3.5" aria-hidden />
                  {formatPercent(Math.abs(delta))}
                  <span className="sr-only">{flat ? "no change" : positive ? "increase" : "decrease"}</span>
                </span>
              )}
              {deltaLabel && delta !== undefined && <span className="text-muted-foreground">{deltaLabel}</span>}
              {hint && delta !== undefined && (
                <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
              )}
              {hint && <span className="min-w-0">{hint}</span>}
            </div>
          )}
        </>
      )}
    </>
  )

  const classes = cn(
    "flex flex-col rounded-2xl border border-border/80 bg-card px-6 py-5 shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]",
    className,
  )
  if (!href) return <div className={classes}>{body}</div>
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        classes,
        "transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  )
}
