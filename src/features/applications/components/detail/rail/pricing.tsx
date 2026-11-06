"use client"

import { SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { MoneyText } from "@/components/shared/money-text"
import { Button } from "@/components/ui/button"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { formatPercent } from "@/lib/format/money"
import { useIsOnDesk } from "../../../hooks/use-is-on-desk"
import { OFFER_ADJUSTABLE_STATUSES } from "../../../schemas/status"
import type { Application } from "../../../types"
import { computeOffer, offeredTerms } from "../../../utils/offer"
import { AdjustOfferDialog } from "../adjust-offer-dialog"
import type { ProductInfo } from "../ui"
import { RailRow, RailSection } from "./ui"

/**
 * What the loan costs on the terms being offered: the monthly repayment and how it adds up.
 * Whoever has the application can adjust the terms here at any step before the customer accepts.
 */
export function Pricing({ app, product }: { app: Application; product: ProductInfo }) {
  const offered = offeredTerms(app)
  const terms = computeOffer(product, offered.amount, offered.tenorMonths)
  const { data: ref } = useReferenceData()
  const fullProduct = ref?.products.find((p) => p.id === app.productId)
  const onDesk = useIsOnDesk(app)
  const canAdjust = onDesk && OFFER_ADJUSTABLE_STATUSES.includes(app.status) && !!fullProduct
  const [adjusting, setAdjusting] = useState(false)

  return (
    <RailSection
      title="Pricing"
      aside={
        canAdjust && (
          <Button variant="ghost" size="sm" className="h-7 text-primary" onClick={() => setAdjusting(true)}>
            <SlidersHorizontal aria-hidden /> Adjust
          </Button>
        )
      }
    >
      <div>
        <div className="tabular text-2xl leading-tight font-bold">
          <MoneyText value={terms.monthlyRepayment} />
        </div>
        <div className="text-xs text-muted-foreground">a month for {terms.tenorMonths} months</div>
      </div>
      <dl className="space-y-2">
        <RailRow label="Principal">
          <MoneyText value={terms.principal} />
        </RailRow>
        <RailRow label="Rate">{formatPercent(terms.monthlyRateBps / 10_000, 2)} flat a month</RailRow>
        <RailRow label="Interest">
          <MoneyText value={terms.totalInterest} />
        </RailRow>
        {terms.fees.map((fee) => (
          <RailRow key={fee.code} label={fee.label}>
            <MoneyText value={fee.amount} />
          </RailRow>
        ))}
        <div className="border-t pt-2">
          <RailRow label="Total repayable">
            <MoneyText value={terms.totalRepayable} />
          </RailRow>
        </div>
      </dl>
      {offered.adjusted && <p className="text-xs text-muted-foreground">On the adjusted offer, not the request.</p>}
      {canAdjust && fullProduct && (
        <AdjustOfferDialog app={app} product={fullProduct} open={adjusting} onOpenChange={setAdjusting} />
      )}
    </RailSection>
  )
}
