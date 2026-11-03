"use client"

import type { ReactNode } from "react"
import { MoneyText } from "@/components/shared/money-text"
import { nairaToKobo } from "@/lib/format/money"
import { computeOffer } from "../../utils/offer"
import { FormCard } from "./fields"
import type { FormValues } from "./schema"

export function ReviewStep({
  values: v,
  productName,
  product,
  guarantors,
  documents,
  missing,
}: {
  values: FormValues
  productName?: string
  product?: { monthlyRateBps: number; fees: { code: string; label: string; rateBps: number }[] }
  guarantors: number
  documents: number
  missing: string[]
}) {
  const amount = nairaToKobo(Number(v.amount))
  const terms = product ? computeOffer(product, amount, Number(v.tenor)) : null
  const rows: [string, ReactNode][] = [
    ["Segment", v.segment === "sme" ? "SME" : "Retail"],
    ["Product", productName ?? "—"],
    ["Amount", <MoneyText key="a" value={amount} />],
    ["Tenor", `${v.tenor} months`],
    ["Est. monthly repayment", terms ? <MoneyText key="m" value={terms.monthlyRepayment} /> : "—"],
    ["Applicant", v.segment === "retail" ? `${v.firstName} ${v.lastName}` : v.businessName],
    [
      "Current account",
      <span key="acct" className="font-mono">
        {v.accountNumber}
      </span>,
    ],
    ["Phone", v.phone],
    ["Email", v.email],
    ["Purpose", v.purpose],
    ["Guarantors", String(guarantors)],
    ["Documents uploaded", String(documents)],
  ]
  return (
    <FormCard
      title="Review and submit"
      description="Check the details. Submitting sends the application straight to verification."
      bodyClassName="space-y-4"
    >
      {missing.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
          <p className="font-medium">Still missing before you can submit</p>
          <p className="text-muted-foreground">{missing.join(", ")}. Save as a draft to finish later.</p>
        </div>
      )}
      <dl className="divide-y rounded-lg border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </FormCard>
  )
}
