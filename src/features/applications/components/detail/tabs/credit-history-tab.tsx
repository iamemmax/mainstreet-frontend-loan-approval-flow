"use client"

import { SegmentedControl } from "@/components/shared/segmented-control"
import {
  Banknote,
  Building2,
  CircleCheck,
  Landmark,
  ScanSearch,
  Smartphone,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { EmptyState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { ToneBadge } from "@/components/shared/status-badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import type { Application, CreditFacility } from "../../../types"
import {
  BUREAU_LABELS,
  FACILITY_STATUS,
  LENDER_TYPE_LABELS,
  summariseCreditHistory,
} from "../../../utils/credit-history"
import { Section } from "../ui"

const LENDER_ICON: Record<CreditFacility["lenderType"], { icon: LucideIcon; tile: string }> = {
  bank: { icon: Landmark, tile: "bg-info/10 text-info" },
  mfb: { icon: Building2, tile: "bg-primary/[0.08] text-primary" },
  digital: { icon: Smartphone, tile: "bg-warning/12 text-warning" },
  cooperative: { icon: Users, tile: "bg-success/10 text-success" },
  other: { icon: Banknote, tile: "bg-muted text-muted-foreground" },
}

/** What the borrower already owes elsewhere, and how they've paid it: from the credit bureaus. */
export function CreditHistoryTab({ app }: { app: Application }) {
  const [view, setView] = useState<"active" | "closed">("active")
  const history = app.creditHistory
  if (!history) {
    return (
      <Card>
        <EmptyState
          icon={<ScanSearch aria-hidden />}
          title="No credit report yet"
          description="It's pulled from CRC, FirstCentral and CreditRegistry when the bureau checks run on the Verification tab."
        />
      </Card>
    )
  }

  const s = summariseCreditHistory(history)
  const rows = history.facilities.filter((f) => (view === "active" ? f.status !== "closed" : f.status === "closed"))
  const bureaus = [...new Set(history.facilities.flatMap((f) => f.bureaus))].map((b) => BUREAU_LABELS[b])
  const warnings: { tone: "danger" | "warning"; text: string }[] = [
    ...(s.inArrears.length
      ? [
          {
            tone: "danger" as const,
            text: `${s.inArrears.length} loan${s.inArrears.length === 1 ? " is" : "s are"} in arrears or written off. ${s.worst ? `Worst: ${FACILITY_STATUS[s.worst.status].label.toLowerCase()} with ${s.worst.lender}.` : ""}`,
          },
        ]
      : []),
    ...(s.loanApps >= 2
      ? [
          {
            tone: "warning" as const,
            text: `Borrowing from ${s.loanApps} loan apps at once. These are short-term and costly, and often a sign of cash-flow strain.`,
          },
        ]
      : []),
    ...(history.enquiries6m >= 4
      ? [
          {
            tone: "warning" as const,
            text: `${history.enquiries6m} lenders searched this record in the last 6 months, so the borrower may be applying elsewhere too.`,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <dl className="grid grid-cols-2 @3xl:grid-cols-4 [&>div]:border-border/70 [&>div]:px-6 [&>div]:py-5 @3xl:[&>div:not(:last-child)]:border-r @max-3xl:[&>div:nth-child(-n+2)]:border-b @max-3xl:[&>div:nth-child(odd)]:border-r">
          <div>
            <dt className="text-[13px] text-muted-foreground">Owed to other lenders</dt>
            <dd className="mt-1.5 text-[1.6rem] leading-none font-bold">
              <MoneyText value={s.outstanding} format="compact" />
            </dd>
            <dd className="mt-2 text-xs text-muted-foreground">
              Still to repay on {s.active.length} active loan{s.active.length === 1 ? "" : "s"}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Monthly repayments</dt>
            <dd className="mt-1.5 text-[1.6rem] leading-none font-bold">
              <MoneyText value={s.monthly} format="compact" />
            </dd>
            <dd className="mt-2 text-xs text-muted-foreground">Before this loan</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Active lenders</dt>
            <dd className="mt-1.5 text-[1.6rem] leading-none font-bold">{s.lenders}</dd>
            <dd className="mt-2 text-xs text-muted-foreground">
              {s.loanApps ? `Including ${s.loanApps} loan app${s.loanApps === 1 ? "" : "s"}` : "No loan apps"}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Repayment record</dt>
            <dd className={cn("mt-1.5 text-lg leading-tight font-bold", s.worst ? "text-destructive" : "text-success")}>
              {s.worst ? FACILITY_STATUS[s.worst.status].label : "Always on time"}
            </dd>
            <dd className="mt-2 text-xs text-muted-foreground">
              {s.worst ? `With ${s.worst.lender}` : `${history.facilities.length} loans on record`}
            </dd>
          </div>
        </dl>
        <div className="space-y-2 border-t px-6 py-4">
          {warnings.length ? (
            warnings.map((w) => (
              <p
                key={w.text}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px]",
                  w.tone === "danger" ? "bg-destructive/[0.06] text-destructive" : "bg-warning/10 text-warning",
                )}
              >
                <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
                {w.text}
              </p>
            ))
          ) : (
            <p className="flex items-center gap-2.5 rounded-xl bg-success/[0.07] px-3.5 py-2.5 text-[13px] text-success">
              <CircleCheck className="size-4 shrink-0" aria-hidden />
              Clean record: every loan paid on time, and few recent credit searches.
            </p>
          )}
        </div>
      </Card>

      <Section
        title="Loans and credit lines"
        description={`Reported by ${bureaus.join(", ")} · pulled ${formatDate(history.pulledAt, "d MMM yyyy")} · ${history.enquiries6m} search${history.enquiries6m === 1 ? "" : "es"} in 6 months`}
        action={
          <SegmentedControl
            aria-label="Show"
            value={view}
            onChange={setView}
            options={[
              { value: "active", label: `Active (${s.active.length})` },
              { value: "closed", label: `Closed (${s.closed})` },
            ]}
          />
        }
        flush
      >
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            {view === "active" ? "No active loans with other lenders." : "No closed loans on record."}
          </p>
        ) : (
          <div className="px-3 pb-3 sm:px-5 sm:pb-5">
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lender</TableHead>
                    <TableHead className="hidden text-right @3xl:table-cell">Borrowed</TableHead>
                    <TableHead className="text-right">Still owed</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden @3xl:table-cell">Reported by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((f) => {
                    const lender = LENDER_ICON[f.lenderType]
                    const status = FACILITY_STATUS[f.status]
                    return (
                      <TableRow key={f.id} className={cn(f.daysPastDue > 0 && "bg-destructive/[0.025]")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", lender.tile)}
                            >
                              <lender.icon className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">{f.lender}</div>
                              <div className="text-xs text-pretty text-muted-foreground">
                                {LENDER_TYPE_LABELS[f.lenderType]} · {f.facilityType} · since{" "}
                                {formatDate(f.openedAt, "MMM yyyy")}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-right @3xl:table-cell">
                          <MoneyText value={f.amount} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyText
                            value={f.outstanding}
                            className={cn("font-semibold", f.outstanding === 0 && "font-normal text-muted-foreground")}
                          />
                          <div className="text-xs text-muted-foreground @3xl:hidden">
                            of <MoneyText value={f.amount} format="compact" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {f.monthlyRepayment ? (
                            <MoneyText value={f.monthlyRepayment} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <ToneBadge tone={status.tone} dot>
                            {status.label}
                          </ToneBadge>
                          {f.daysPastDue > 0 && (
                            <div className="mt-1 pl-1 text-xs text-muted-foreground">{f.daysPastDue} days overdue</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden @3xl:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {f.bureaus.map((b) => (
                              <span
                                key={b}
                                className="rounded border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                              >
                                {BUREAU_LABELS[b]}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
