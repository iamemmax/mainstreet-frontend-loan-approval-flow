"use client"

import { Copy } from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { RiskBadge, SLABadge, StatusBadge } from "@/components/shared/status-badge"
import type { computeSla } from "@/features/workflow/engine"
import { formatDate } from "@/lib/format/date"
import type { Application } from "../../types"

interface SummaryHeaderProps {
  app: Application
  name: string
  productName?: string
  sla: ReturnType<typeof computeSla> | null
  /** Shown under the header on screens where the review panel isn't beside it. */
  actions: ReactNode
}

/** Who and where the file stands on one line; the reference, product and date on the next. */
export function SummaryHeader({ app, name, productName, sla, actions }: SummaryHeaderProps) {
  const copy = () => {
    void navigator.clipboard?.writeText(app.reference)
    toast.success(`Copied ${app.reference}`)
  }

  return (
    <header className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        <StatusBadge status={app.status} icon />
        {sla && <SLABadge state={sla.state} dueAt={sla.dueAt} />}
        {app.riskRating && <RiskBadge rating={app.riskRating} />}
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={copy}
          title="Copy reference"
          className="group inline-flex items-center gap-1 font-mono hover:text-foreground"
        >
          {app.reference}
          <Copy className="size-3 opacity-50 group-hover:opacity-100" aria-hidden />
        </button>
        {productName && (
          <>
            <span aria-hidden>·</span>
            <span>{productName}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{app.submittedAt ? `Applied ${formatDate(app.submittedAt, "d MMM yyyy")}` : "Not submitted yet"}</span>
      </p>
      {actions}
    </header>
  )
}
