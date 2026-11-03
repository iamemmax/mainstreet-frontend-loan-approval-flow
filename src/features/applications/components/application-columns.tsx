"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Copy, ExternalLink, Eye, History, MoreVertical, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { InitialsAvatar, toneFor } from "@/components/shared/initials-avatar"
import { MoneyText } from "@/components/shared/money-text"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate, formatRelative } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import type { ApplicationFlag, ApplicationListItem } from "../types"

const FLAG_LABEL: Record<ApplicationFlag, string> = {
  duplicate_applicant: "Possible duplicate applicant",
  bvn_failed: "BVN verification failed",
  pep_hit: "Politically exposed person",
  self_approval_attempt: "Self-approval was attempted",
  auto_escalated: "Auto-escalated after SLA breach",
}

/** Each product keeps one colour across the list, so they're easy to tell apart. */
const PRODUCT_TONES = [
  "bg-primary/[0.08] text-primary",
  "bg-success/10 text-success",
  "bg-info/10 text-info",
  "bg-warning/12 text-warning",
  "bg-chart-2/15 text-chart-2",
] as const

const SLA_TEXT = {
  on_track: null,
  due_soon: { text: "Due soon", className: "text-warning" },
  breached: { text: "Overdue", className: "text-destructive" },
} as const

function Flags({ flags }: { flags: ApplicationFlag[] }) {
  if (!flags.length) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex text-warning" aria-label={flags.map((f) => FLAG_LABEL[f]).join(", ")}>
          <TriangleAlert className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <ul>
          {flags.map((f) => (
            <li key={f}>{FLAG_LABEL[f]}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

interface ColumnActions {
  /** Opens the quick-look sheet. */
  onReview: (row: ApplicationListItem) => void
  /** Goes to the full application page, optionally on a tab. */
  onOpen: (row: ApplicationListItem, tab?: string) => void
}

/** Column ids match the API's sort fields where the column is sortable. */
export function applicationColumns({ onReview, onOpen }: ColumnActions): ColumnDef<ApplicationListItem>[] {
  return [
    {
      id: "applicantName",
      header: "Borrower",
      cell: ({ row: { original: a } }) => (
        <div className="flex min-w-48 items-center gap-3">
          <InitialsAvatar name={a.applicantName} className="size-9 text-[11px]" />
          <div className="min-w-0 whitespace-normal">
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-snug font-semibold">{a.applicantName}</span>
              <Flags flags={a.flags} />
            </div>
            <div className="font-mono text-xs text-muted-foreground">{a.reference}</div>
          </div>
        </div>
      ),
      meta: { skeletonWidth: "w-44" },
    },
    {
      id: "amountRequested",
      header: "Loan",
      cell: ({ row: { original: a } }) => (
        <div className="space-y-1">
          <MoneyText value={a.amountRequested} className="text-sm font-semibold" />
          <div className="flex items-center justify-end gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                toneFor(a.productId, PRODUCT_TONES),
              )}
            >
              <span aria-hidden className="size-1 rounded-full bg-current" />
              {a.productName}
            </span>
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {a.tenorMonths} mo
            </span>
          </div>
        </div>
      ),
      meta: { align: "right", skeletonWidth: "w-28" },
    },
    {
      id: "repayment",
      header: "Repayment",
      cell: ({ row: { original: a } }) => (
        <div className="space-y-1">
          <div>
            <MoneyText value={a.monthlyRepayment} className="text-sm font-semibold" />
            <span className="text-[13px] text-muted-foreground">/mo</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <MoneyText value={a.totalInterest} /> interest
          </div>
        </div>
      ),
      // Repayment joins in on wide screens; the sheet always shows it.
      meta: { align: "right", className: "hidden min-[1500px]:table-cell" },
    },
    {
      id: "status",
      header: "Stage",
      cell: ({ row: { original: a } }) => {
        const sla = a.sla ? SLA_TEXT[a.sla.state] : null
        return (
          <div className="space-y-1">
            <StatusBadge status={a.status} icon />
            {(a.currentStageName || sla) && (
              <div className="pl-1 text-xs text-muted-foreground">
                {a.currentStageName}
                {sla && (
                  <span className={cn("font-medium", sla.className)}>
                    {a.currentStageName ? " · " : ""}
                    {sla.text}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "createdAt",
      header: "Applied",
      cell: ({ row: { original: a } }) => (
        <div className="space-y-0.5">
          <div className="tabular text-[13px]">{formatDate(a.createdAt, "MMM d, yyyy")}</div>
          <time dateTime={a.createdAt} className="text-xs text-muted-foreground">
            {formatRelative(a.createdAt)}
          </time>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: a } }) => (
        // Clicks here act on the buttons, not the row.
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* On smaller laptops the label folds into the icon so the row still fits. */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg bg-primary/[0.07] text-primary hover:bg-primary/[0.12] hover:text-primary max-[1360px]:w-8 max-[1360px]:px-0"
            onClick={() => onReview(a)}
          >
            <Eye aria-hidden /> <span className="max-[1360px]:sr-only">Review</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label={`More actions for ${a.applicantName}`}
              >
                <MoreVertical aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => onOpen(a)}>
                <ExternalLink aria-hidden /> Open full details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onOpen(a, "activity")}>
                <History aria-hidden /> View activity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void navigator.clipboard?.writeText(a.reference)
                  toast.success(`Copied ${a.reference}`)
                }}
              >
                <Copy aria-hidden /> Copy reference
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      meta: { align: "right" },
    },
  ]
}
