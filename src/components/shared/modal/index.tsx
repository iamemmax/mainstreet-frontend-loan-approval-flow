import { TriangleAlert, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Pass to DialogContent: the modal parts below bring their own padding. */
export const MODAL_CONTENT =
  "gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[460px] [&>[data-slot=dialog-close]]:top-[1.625rem] [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:z-10"

export type ModalTone = "primary" | "danger" | "warning" | "success"

/** Each tone: a faint wash for the header band, the icon colour, and the step bar. */
const TONE: Record<ModalTone, { band: string; icon: string; bar: string }> = {
  primary: { band: "from-primary/[0.06]", icon: "text-primary ring-primary/15", bar: "bg-primary" },
  danger: { band: "from-destructive/[0.07]", icon: "text-destructive ring-destructive/20", bar: "bg-destructive" },
  warning: { band: "from-warning/[0.10]", icon: "text-warning ring-warning/25", bar: "bg-warning" },
  success: { band: "from-success/[0.08]", icon: "text-success ring-success/20", bar: "bg-success" },
}

interface ModalHeaderProps {
  icon: LucideIcon
  tone?: ModalTone
  title: ReactNode
  /** One short line under the title. */
  description?: ReactNode
  /** What the dialog is about, shown as chips: reference, applicant, amount. */
  meta?: ReactNode[]
  step?: { current: number; total: number }
}

export function ModalHeader({ icon: Icon, tone = "primary", title, description, meta, step }: ModalHeaderProps) {
  const t = TONE[tone]
  return (
    <div className={cn("border-b bg-gradient-to-b to-transparent px-6 pt-5 pb-4", t.band)}>
      <div className="flex items-start gap-3.5 pr-8">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-xs ring-1 ring-inset",
            t.icon,
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 pt-px">
          <DialogTitle className="text-base leading-6 font-semibold tracking-tight">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-0.5 text-[13px] leading-5 text-pretty">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
      </div>
      {meta && meta.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {meta.map((m, i) => (
            <span
              key={i}
              className="inline-flex h-6 max-w-full items-center truncate rounded-md border border-border/80 bg-card px-2 text-xs font-medium text-foreground/80"
            >
              {m}
            </span>
          ))}
        </div>
      )}
      {step && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {Array.from({ length: step.total }, (_, i) => (
              <span
                key={i}
                className={cn("h-1 flex-1 rounded-full transition-colors", i < step.current ? t.bar : "bg-border")}
              />
            ))}
          </div>
          <span className="tabular text-[11px] font-medium text-muted-foreground">
            Step {step.current} of {step.total}
          </span>
        </div>
      )}
    </div>
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5 px-6 py-5", className)}>{children}</div>
}

export function ModalFooter({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
      {aside && <div className="text-xs text-muted-foreground sm:mr-auto">{aside}</div>}
      {children}
    </div>
  )
}

/** What the action applies to, as a compact two-column summary. */
export function ModalFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5">
      {items.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[11px] font-medium tracking-[0.04em] text-muted-foreground uppercase">{f.label}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ModalNote({ children, tone = "danger" }: { children: ReactNode; tone?: "danger" | "warning" }) {
  return (
    <p
      role="note"
      className={cn(
        "flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "danger" ? "bg-destructive/[0.06] text-destructive" : "bg-warning/10 text-warning",
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
