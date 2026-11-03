import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A card in the preview sheet: a small icon-and-caps heading, then content. */
export function SheetSection({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: LucideIcon
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          <Icon className="size-3.5" aria-hidden />
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Label-over-value pairs on two columns. `span` items take a full row. */
export function InfoGrid({ items }: { items: { label: string; value: ReactNode; span?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
      {items.map((i) => (
        <div key={i.label} className={cn("min-w-0", i.span && "col-span-2")}>
          <dt className="text-xs text-muted-foreground">{i.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold break-words">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
