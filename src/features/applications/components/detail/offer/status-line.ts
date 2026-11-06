import { formatDate, formatRelative } from "@/lib/format/date"
import type { Application } from "../../../types"
import { currentOffer, isOfferExpired } from "../../../utils/offer"

/** One plain line saying where the offer stands, shown under the Offer button and in the offer sheet. */
export function offerStatusLine(app: Application): string {
  const offer = currentOffer(app)
  const expires = offer ? new Date(offer.expiresAt) : null
  if (app.status === "offer_sent" && offer && expires && isOfferExpired(offer)) {
    return `The offer expired on ${formatDate(expires, "d MMM yyyy")} without a response. Resend the offer if the customer still wants the loan.`
  }
  if (app.status === "offer_sent" && expires) {
    return `Waiting for the customer. The offer expires ${formatDate(expires, "d MMM yyyy")} (${formatRelative(expires)}).`
  }
  if (app.status === "approved") return "Approved — send the offer to the customer."
  if (app.status === "offer_accepted") return "Accepted. Hand the loan over to finance for disbursement."
  if (app.status === "ready_for_disbursement") return "With finance for disbursement."
  return "Whoever has the application at each step can adjust these terms until the customer accepts."
}
