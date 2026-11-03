import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Small line above the title, e.g. a reference or section name. */
  eyebrow?: ReactNode
  actions?: ReactNode
  /** Extra row under the title for badges and metadata. */
  meta?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <div className="text-xs font-medium text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-[2rem] sm:leading-tight">{title}</h1>
        {description && <p className="max-w-2xl text-[15px] text-muted-foreground text-pretty">{description}</p>}
        {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
