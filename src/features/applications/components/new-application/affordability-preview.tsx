"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import { useWatch } from "react-hook-form"
import type { Product } from "@/features/admin/types"
import { formatNaira, formatPercent, nairaToKobo } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { computeOffer } from "../../utils/offer"
import { DTI_LIMIT } from "../../utils/scorecard"
import { FormCard } from "./fields"
import type { FormValues } from "./schema"

/** The bar runs to twice the limit, so the limit marker sits in the middle. */
const SCALE = DTI_LIMIT * 2

/**
 * A live first look at affordability while income is entered: the repayment
 * against income and the policy limit. The analyst's assessment is the real check.
 */
export function AffordabilityPreview({ product }: { product?: Product }) {
  const [segment, amount, tenor, netIncome, revenue, expenses] = useWatch<FormValues>({
    name: ["segment", "amount", "tenor", "monthlyNetIncome", "monthlyRevenue", "monthlyExpenses"],
  }) as string[]
  const income = nairaToKobo(segment === "sme" ? Number(revenue || 0) - Number(expenses || 0) : Number(netIncome || 0))
  const principal = nairaToKobo(Number(amount || 0))
  const months = Number(tenor || 0)
  const repayment =
    product && principal > 0 && months > 0 ? computeOffer(product, principal, months).monthlyRepayment : null

  if (!product || repayment === null) return null
  const share = income > 0 ? repayment / income : null
  const within = share !== null && share <= DTI_LIMIT
  // The shortest tenor in the product's range that would bring the repayment within the limit.
  const fits =
    share !== null && !within
      ? Array.from(
          { length: product.maxTenorMonths - product.minTenorMonths + 1 },
          (_, i) => product.minTenorMonths + i,
        ).find((t) => computeOffer(product, principal, t).monthlyRepayment <= income * DTI_LIMIT)
      : undefined

  return (
    <FormCard
      title="Affordability preview"
      description={`${product.name} · ${formatNaira(principal)} over ${months} months`}
      action={
        share !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              within ? "bg-success/10 text-success" : "bg-warning/15 text-warning",
            )}
          >
            {within ? (
              <CircleCheck className="size-3.5" aria-hidden />
            ) : (
              <TriangleAlert className="size-3.5" aria-hidden />
            )}
            {within ? "Within policy" : "Above the limit"}
          </span>
        )
      }
      bodyClassName="space-y-5"
    >
      <dl className="grid grid-cols-3 divide-x divide-border/70 rounded-xl border border-border/70">
        {[
          ["Monthly repayment", formatNaira(repayment)],
          [segment === "sme" ? "Monthly surplus" : "Monthly income", income > 0 ? formatNaira(income) : "—"],
          ["Share of income", share === null ? "—" : formatPercent(share, 0)],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "tabular mt-1 text-lg font-semibold",
                label === "Share of income" && share !== null && !within && "text-warning",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1.5">
        <div className="relative h-2 rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              within ? "bg-success" : "bg-warning",
            )}
            style={{ width: `${Math.min((share ?? 0) / SCALE, 1) * 100}%` }}
          />
          <span
            aria-hidden
            className="absolute -top-1 left-1/2 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60"
          />
        </div>
        <div className="relative h-4 text-[11px] text-muted-foreground">
          <span className="absolute left-1/2 -translate-x-1/2">{formatPercent(DTI_LIMIT, 0)} limit</span>
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground text-pretty">
        {share === null
          ? `Enter the ${segment === "sme" ? "revenue and expenses" : "monthly net income"} to see how the repayment compares with the ${formatPercent(DTI_LIMIT, 0)} policy limit.`
          : within
            ? "The repayment fits within policy. The credit analyst confirms this against the bank statement during assessment."
            : fits
              ? `At ${fits} months the repayment would be ${formatNaira(computeOffer(product, principal, fits).monthlyRepayment)}, within the limit. You can change the tenor on the Loan step.`
              : "No tenor in this product's range brings the repayment within the limit. Consider a smaller amount."}
      </p>
    </FormCard>
  )
}
