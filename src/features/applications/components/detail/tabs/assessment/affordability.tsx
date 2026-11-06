"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import { MoneyText } from "@/components/shared/money-text"
import { formatNaira, formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { DTI_LIMIT } from "../../../../utils/scorecard"

/**
 * Affordability in plain terms: what's left after living costs, how much of it the
 * loans take, and a verdict. The bar is the money left over each month.
 */
export function Affordability({
  income,
  expenses,
  existing,
  repayment,
  business,
}: {
  income: number
  expenses: number
  existing: number
  repayment: number
  business: boolean
}) {
  const left = income - expenses
  const loans = existing + repayment
  const share = left > 0 ? loans / left : null
  const limit = Math.max(0, Math.round(left * DTI_LIMIT))
  const ok = share !== null && share <= DTI_LIMIT
  const pct = (v: number) => (left > 0 ? `${Math.min(100, Math.max(0, (v / left) * 100))}%` : "0%")

  return (
    <div className="space-y-4">
      <div className={cn("flex items-start gap-3 rounded-xl p-4", ok ? "bg-success/[0.07]" : "bg-destructive/[0.06]")}>
        {ok ? (
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        ) : (
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        )}
        <div className="space-y-0.5">
          <p className={cn("font-semibold", ok ? "text-success" : "text-destructive")}>
            {share === null
              ? "No — living costs use up all the income"
              : ok
                ? `Yes — loan repayments take ${formatPercent(share, 0)} of what's left`
                : `No — loan repayments would take ${formatPercent(share, 0)} of what's left`}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {share === null
              ? "Check the income and living costs entered."
              : ok
                ? `${formatNaira(limit - loans)} a month could still go to repayments before the ${formatPercent(DTI_LIMIT, 0)} limit.`
                : `${formatNaira(loans - limit)} a month over the ${formatPercent(DTI_LIMIT, 0)} limit. A smaller amount or a longer tenor would bring it down.`}
          </p>
        </div>
      </div>

      {left > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Each month, of the {formatNaira(left)} left after living costs:
          </div>
          <div className="relative">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-muted-foreground/50" style={{ width: pct(existing) }} title="Other loans" />
              <div
                className={cn("h-full", ok ? "bg-primary" : "bg-destructive")}
                style={{ width: pct(repayment) }}
                title="This loan"
              />
            </div>
            <span
              aria-hidden
              className="absolute -top-1 h-5 w-0.5 rounded-full bg-foreground/70"
              style={{ left: `${DTI_LIMIT * 100}%` }}
            />
          </div>
          <div className="relative h-4 text-[11px] text-muted-foreground">
            <span className="absolute -translate-x-1/2" style={{ left: `${DTI_LIMIT * 100}%` }}>
              {formatPercent(DTI_LIMIT, 0)} limit
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", ok ? "bg-primary" : "bg-destructive")} />
              This loan <MoneyText value={repayment} className="font-medium" />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted ring-1 ring-border" />
              Free <MoneyText value={Math.max(0, left - loans)} className="font-medium" />
            </span>
          </div>
        </div>
      )}

      <dl className="overflow-hidden rounded-xl border border-border/80 text-sm">
        <div className="bg-muted/40 px-4 py-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          How it&apos;s worked out
        </div>
        <Line label={business ? "Money coming in each month (net)" : "Monthly take-home pay"} value={income} />
        <Line label="Minus living costs" value={-expenses} />
        <Line label="Left after living costs" value={left} total />
        <Line label="Other loan repayments" value={existing} />
        <Line label="This loan's repayment" value={repayment} />
        <Line label="All loan repayments" value={loans} total tone={ok ? undefined : "danger"} />
      </dl>
    </div>
  )
}

function Line({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total?: boolean
  tone?: "danger" | "success"
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5",
        total ? "border-y border-border/70 bg-muted/40 font-semibold first:border-t-0 last:border-b-0" : "",
      )}
    >
      <dt className={cn(!total && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("tabular", tone === "danger" && "text-destructive", tone === "success" && "text-success")}>
        {value < 0 ? "− " : ""}
        {formatNaira(Math.abs(value))}
      </dd>
    </div>
  )
}
