import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Card header height; side rails use the same so their divider lines sit on one line. */
export const FORM_HEADER = "flex h-[4.5rem] flex-col justify-center border-b"

interface FormCardProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  bodyClassName?: string
  /** A footer bar, e.g. Save and Reset buttons. */
  footer?: ReactNode
}

/** A content card with a header band, body and optional footer. Used by forms and settings. */
export function FormCard({ title, description, action, children, bodyClassName, footer }: FormCardProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]"
    >
      <header className={cn(FORM_HEADER, "flex-row items-center justify-between gap-4 px-6")}>
        <div className="min-w-0">
          <h2 className="text-[15px] leading-6 font-semibold tracking-tight">{title}</h2>
          {description && <p className="truncate text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children != null && <div className={cn("flex-1 p-6", bodyClassName)}>{children}</div>}
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3.5">
          {footer}
        </footer>
      )}
    </section>
  )
}
