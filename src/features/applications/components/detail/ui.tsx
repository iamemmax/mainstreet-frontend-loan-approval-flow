"use client"

import { CircleAlert, CircleCheck, CircleHelp } from "lucide-react"
import type { ReactNode } from "react"
import { initials } from "@/lib/format/name"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface ProductInfo {
  name: string
  monthlyRateBps: number
  fees: { code: string; label: string; rateBps: number }[]
}

export function Section({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <Card className={cn(flush && "gap-0 pb-0", className)}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn(flush && "px-0")}>{children}</CardContent>
    </Card>
  )
}

/** Label above value, in an even grid. */
export function Facts({ items, cols = 2 }: { items: [string, ReactNode][]; cols?: 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-5", cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[13px] text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-[15px] font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{children}</h3>
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-sm font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function TextLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-success underline-offset-4 hover:underline"
    >
      {children}
    </button>
  )
}

/** Label left, value right — fits narrow cards without wrapping. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  )
}

export const CHECK_STATUS = {
  passed: { tone: "success", label: "Passed", icon: CircleCheck, bar: "bg-success" },
  review: { tone: "warning", label: "Needs review", icon: CircleHelp, bar: "bg-warning" },
  failed: { tone: "danger", label: "Failed", icon: CircleAlert, bar: "bg-destructive" },
} as const

/** A dot-separated count, e.g. "8 passed". */
export function Count({ n, label, className }: { n: number; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="tabular font-semibold text-foreground">{n}</span> {label}
    </span>
  )
}
