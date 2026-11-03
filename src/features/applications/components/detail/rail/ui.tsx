import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** One block of the review panel: a small caps heading, an optional aside, then content. */
export function RailSection({
  title,
  aside,
  children,
  className,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={cn("space-y-3.5 px-5 py-5", className)}>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function RailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-balance">{children}</dd>
    </div>
  )
}
