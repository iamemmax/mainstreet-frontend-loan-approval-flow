"use client"

import { ErrorState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { Skeleton } from "@/components/ui/skeleton"
import type { Agent, Branch } from "@/features/admin/types"
import { useAuditEvents } from "@/features/audit/hooks/use-audit-events"
import type { User } from "@/features/auth/types"
import { formatDate, formatRelative } from "@/lib/format/date"
import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { Application } from "../../../types"
import type { OfferTerms } from "../../../utils/offer"
import { Avatar, Facts, GroupLabel, type ProductInfo, Row, Section, TextLink } from "../ui"

interface OverviewTabProps {
  app: Application
  product?: ProductInfo
  branch?: Branch
  officer?: User
  agent?: Agent
  terms: OfferTerms | null
  onOpenTab: (tab: "applicant" | "activity") => void
}

/** The loan request, who the applicant is and what happened lately. */
export function OverviewTab({ app, product, branch, officer, agent, terms, onOpenTab }: OverviewTabProps) {
  const a = app.applicant
  const income =
    app.employment?.monthlyNetIncome ??
    (app.business ? app.business.monthlyRevenue - app.business.monthlyExpenses : null)

  return (
    <div className="space-y-5">
      <Section title="Loan request">
        <div className="space-y-6">
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <div className="text-[13px] text-muted-foreground">Loan Purpose</div>
            <p className="mt-0.5 text-[15px] font-medium">{app.purpose}</p>
          </div>
          <div className="grid gap-8 @4xl:grid-cols-2 @4xl:divide-x @4xl:[&>div+div]:pl-8">
            <div>
              <GroupLabel>Request</GroupLabel>
              <Facts
                cols={3}
                items={[
                  ["Product", product?.name ?? "—"],
                  ["Monthly rate", product ? `${formatPercent(product.monthlyRateBps / 10_000, 2)} flat` : "—"],
                  ["Amount", <MoneyText key="a" value={app.amountRequested} />],
                  ["Tenor", `${app.tenorMonths} months`],
                  ["Monthly repayment", terms ? <MoneyText key="m" value={terms.monthlyRepayment} /> : "—"],
                  ["Total repayable", terms ? <MoneyText key="t" value={terms.totalRepayable} /> : "—"],
                ]}
              />
            </div>
            <div>
              <GroupLabel>Origination</GroupLabel>
              <Facts
                cols={3}
                items={[
                  ["Branch", branch?.name ?? "—"],
                  ["Channel", agent ? "Agent" : "Branch"],
                  ["Relationship officer", officer?.name ?? "—"],
                  ["Referring agent", agent?.name ?? "Direct"],
                  ["Submitted", app.submittedAt ? formatDate(app.submittedAt) : "Not yet"],
                  ["Last updated", formatRelative(app.updatedAt)],
                ]}
              />
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-5 @4xl:grid-cols-2">
        <Section
          title={a.kind === "business" ? "Business at a glance" : "Applicant at a glance"}
          action={<TextLink onClick={() => onOpenTab("applicant")}>Full profile</TextLink>}
          flush
        >
          <div className="flex items-center gap-3 px-6 pt-5 pb-4">
            <Avatar
              name={a.kind === "business" ? a.businessName : `${a.firstName} ${a.lastName}`}
              className="size-11 rounded-xl"
            />
            <div className="min-w-0">
              <div className="font-semibold">
                {a.kind === "business" ? a.businessName : `${a.firstName} ${a.lastName}`}
              </div>
              <div className="line-clamp-2 text-[13px] text-muted-foreground">
                {a.kind === "business"
                  ? `${a.sector} · ${a.yearsInOperation} years in operation`
                  : `${app.employment?.jobTitle ?? "—"}, ${app.employment?.employerName ?? "—"}`}
              </div>
            </div>
          </div>
          <dl className="divide-y border-t text-sm">
            <Row label={a.kind === "business" ? "Net cash flow / month" : "Net income / month"}>
              {income !== null ? <MoneyText value={Math.max(0, income)} /> : "—"}
            </Row>
            <Row label={a.kind === "business" ? "Promoter" : "Salary bank"}>
              {a.kind === "business" ? a.promoter.name : (app.employment?.salaryBank ?? "—")}
            </Row>
            <Row label="State">{a.state}</Row>
          </dl>
        </Section>

        <RecentActivity id={app.id} onViewAll={() => onOpenTab("activity")} />
      </div>
    </div>
  )
}

function eventTone(action: string) {
  if (/reject|blocked|failed/.test(action)) return "bg-destructive"
  if (/return|request_info|escalat/.test(action)) return "bg-warning"
  if (/approve|accepted|ready|completed|passed/.test(action)) return "bg-success"
  return "bg-primary/40"
}

function RecentActivity({ id, className, onViewAll }: { id: string; className?: string; onViewAll: () => void }) {
  // The audit API pages in fives at minimum; show the latest five.
  const { data, isPending, error, refetch } = useAuditEvents({ entityId: id, pageSize: 5 })
  return (
    <Section
      title="Recent activity"
      className={className}
      action={<TextLink onClick={onViewAll}>View all</TextLink>}
      flush
    >
      {isPending ? (
        <Skeleton className="mx-6 mb-5 h-32" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} size="sm" />
      ) : !data.items.length ? (
        <p className="px-6 pb-5 text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ol className="divide-y pt-1">
          {data.items.map((e) => (
            <li key={e.id} className="flex gap-3 px-6 py-3">
              <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", eventTone(e.action))} />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-medium">
                  {e.summary.charAt(0).toUpperCase() + e.summary.slice(1)}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {e.actorName} ·{" "}
                  <time dateTime={e.at} title={formatDate(e.at, "d MMM yyyy, HH:mm")}>
                    {formatRelative(e.at)}
                  </time>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}
