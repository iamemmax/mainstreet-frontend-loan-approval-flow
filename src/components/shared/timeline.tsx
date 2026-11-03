import type { ReactNode } from "react"
import { formatDateTime, formatRelative } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import { TONE_DOT, type Tone } from "./tone"

export interface TimelineItem {
  id: string
  title: ReactNode
  at: string
  actor?: ReactNode
  description?: ReactNode
  tone?: Tone
  icon?: ReactNode
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {i < items.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />}
          <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground [&_svg]:size-3">
            {item.icon ?? <span className={cn("size-2 rounded-full", TONE_DOT[item.tone ?? "neutral"])} />}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              <time
                dateTime={item.at}
                title={formatDateTime(item.at)}
                className="tabular text-xs text-muted-foreground"
              >
                {formatRelative(item.at)}
              </time>
            </div>
            {item.actor && <p className="text-xs text-muted-foreground">{item.actor}</p>}
            {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}
