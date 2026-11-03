import type { Product } from "@/features/admin/types"
import type { Application, OfferRecord } from "@/features/applications/types"

/** How long a customer has to accept an offer link. */
export const OFFER_VALID_DAYS = 14

/** The amount and tenor the bank is offering: the adjusted terms if set, otherwise what was asked for. */
export function offeredTerms(app: Pick<Application, "amountRequested" | "tenorMonths" | "offerTerms">) {
  return {
    amount: app.offerTerms?.amount ?? app.amountRequested,
    tenorMonths: app.offerTerms?.tenorMonths ?? app.tenorMonths,
    adjusted: app.offerTerms !== null,
  }
}

/** The latest offer issued; earlier ones are superseded or already answered. */
export function currentOffer(app: Pick<Application, "offers">): OfferRecord | null {
  return app.offers.at(-1) ?? null
}

export function isOfferExpired(offer: OfferRecord, now = Date.now()) {
  return offer.status === "sent" && Date.parse(offer.expiresAt) < now
}

export interface OfferTerms {
  principal: number
  tenorMonths: number
  monthlyRateBps: number
  totalInterest: number
  fees: { code: string; label: string; amount: number }[]
  totalFees: number
  monthlyRepayment: number
  totalRepayable: number
}

/**
 * Flat-rate pricing: interest accrues on the original principal every month,
 * fees are deducted upfront. All amounts are kobo, rounded to whole kobo.
 */
export function computeOffer(
  product: Pick<Product, "monthlyRateBps" | "fees">,
  principal: number,
  tenorMonths: number,
): OfferTerms {
  const totalInterest = Math.round((principal * product.monthlyRateBps * tenorMonths) / 10_000)
  const fees = product.fees.map((f) => ({
    code: f.code,
    label: f.label,
    amount: Math.round((principal * f.rateBps) / 10_000),
  }))
  const totalRepayable = principal + totalInterest
  return {
    principal,
    tenorMonths,
    monthlyRateBps: product.monthlyRateBps,
    totalInterest,
    fees,
    totalFees: fees.reduce((t, f) => t + f.amount, 0),
    monthlyRepayment: Math.round(totalRepayable / tenorMonths),
    totalRepayable,
  }
}
