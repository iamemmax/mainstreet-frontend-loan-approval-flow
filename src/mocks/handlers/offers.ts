import { OFFER_ADJUSTABLE_STATUSES } from "@/features/applications/schemas/status"
import type { AdjustOfferInput, Application, OfferRecord } from "@/features/applications/types"
import { computeOffer, isOfferExpired, OFFER_VALID_DAYS, offeredTerms } from "@/features/applications/utils/offer"
import type { Session } from "@/features/auth/types"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"
import { applicantName } from "./applications"

const TOKEN_BYTES = 24

/** 48 hex characters from the platform CSPRNG: the link can't be guessed from the reference or id. */
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/** OFR-YYMM-NNNNN, numbered across the whole bank so no two offers share a number. */
function nextOfferNumber(store: MockStore, now: Date) {
  const last = Math.max(0, ...store.applications.flatMap((a) => a.offers.map((o) => Number(o.number.slice(-5)))))
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`
  return `OFR-${yymm}-${String(last + 1).padStart(5, "0")}`
}

/** Issues a fresh offer with its own number and link. Any earlier open link stops working. */
export function issueOffer(store: MockStore, session: Session, app: Application, now: Date): OfferRecord {
  const tokens = new Set(store.applications.flatMap((a) => a.offers.map((o) => o.token)))
  let token = newToken()
  while (tokens.has(token)) token = newToken()
  for (const o of app.offers) if (o.status === "sent") o.status = "superseded"
  const offer: OfferRecord = {
    id: `${app.id}-ofr-${app.offers.length + 1}`,
    number: nextOfferNumber(store, now),
    token,
    ...(({ amount, tenorMonths }) => ({ amount, tenorMonths }))(offeredTerms(app)),
    sentAt: now.toISOString(),
    sentById: session.user.id,
    expiresAt: new Date(now.getTime() + OFFER_VALID_DAYS * 86_400_000).toISOString(),
    status: "sent",
    respondedAt: null,
  }
  app.offers.push(offer)
  return offer
}

function findOffer(store: MockStore, token: string) {
  for (const app of store.applications) {
    const offer = app.offers.find((o) => o.token === token)
    if (offer) return { app, offer }
  }
  throw new ApiError(404, "not_found", "This offer link is not valid. Check the link in your SMS or email.")
}

function linkStatus(offer: OfferRecord, now = Date.now()) {
  if (offer.status === "sent") return isOfferExpired(offer, now) ? "expired" : "active"
  return offer.status
}

export function offerView(store: MockStore, token: string) {
  const { app, offer } = findOffer(store, token)
  const product = store.reference.products.find((p) => p.id === app.productId)!
  return {
    reference: app.reference,
    offerNumber: offer.number,
    linkStatus: linkStatus(offer),
    applicantName: applicantName(app),
    productName: product.name,
    status: app.status,
    requestedAmount: app.amountRequested,
    requestedTenorMonths: app.tenorMonths,
    ...computeOffer(product, offer.amount, offer.tenorMonths),
    branchName: store.reference.branches.find((b) => b.id === app.branchId)?.name ?? "—",
    expiresAt: offer.expiresAt,
  }
}

const CLOSED_LINK: Record<string, string> = {
  expired: "This offer has expired. Contact your branch for a new offer.",
  superseded: "This link has been replaced by a newer offer. Use the latest link sent to you.",
  accepted: "You have already accepted this offer.",
  declined: "You have already declined this offer.",
}

/** The customer can respond only on the current, unexpired link, and only once. */
export function respondToOffer(
  store: MockStore,
  token: string,
  accept: boolean,
  audit: (app: Application, action: string, summary: string, metadata: Record<string, string>) => void,
) {
  const { app, offer } = findOffer(store, token)
  const status = linkStatus(offer)
  if (status !== "active" || app.status !== "offer_sent")
    throw new ApiError(409, "offer_closed", CLOSED_LINK[status] ?? "This offer can no longer be accepted.")
  const now = new Date().toISOString()
  offer.status = accept ? "accepted" : "declined"
  offer.respondedAt = now
  app.status = accept ? "offer_accepted" : "approved"
  app.updatedAt = now
  audit(
    app,
    accept ? "offer.accepted" : "offer.declined",
    `Customer ${accept ? "accepted" : "declined"} offer ${offer.number}`,
    { offer: offer.number },
  )
  return offerView(store, token)
}

/**
 * Changes the amount or tenor the bank offers, at any step before the customer accepts. Only ever down from what was asked,
 * within the product's limits, with a reason, signed with the PIN. An offer that is
 * already out is re-issued on a new link so the customer sees the new terms.
 */
export function adjustOffer(store: MockStore, session: Session, app: Application, input: AdjustOfferInput, now: Date) {
  if (!OFFER_ADJUSTABLE_STATUSES.includes(app.status))
    throw new ApiError(409, "not_adjustable", "Offer terms can only change before the customer accepts")
  const product = store.reference.products.find((p) => p.id === app.productId)!
  if (input.amount > app.amountRequested)
    throw new ApiError(422, "above_request", "The offer can't be more than the customer asked for")
  if (input.amount < product.minAmount)
    throw new ApiError(422, "below_minimum", `${product.name} lends at least the product minimum`)
  if (input.tenorMonths < product.minTenorMonths || input.tenorMonths > product.maxTenorMonths) {
    throw new ApiError(
      422,
      "tenor_out_of_range",
      `${product.name} runs for ${product.minTenorMonths}–${product.maxTenorMonths} months`,
    )
  }
  const current = offeredTerms(app)
  if (input.amount === current.amount && input.tenorMonths === current.tenorMonths)
    throw new ApiError(422, "unchanged", "Change the amount or the tenor first")
  const asked = input.amount === app.amountRequested && input.tenorMonths === app.tenorMonths
  app.offerTerms = asked
    ? null
    : {
        amount: input.amount,
        tenorMonths: input.tenorMonths,
        reason: input.reason,
        setById: session.user.id,
        setAt: now.toISOString(),
      }
  const reissued = app.status === "offer_sent" ? issueOffer(store, session, app, now) : null
  return reissued
}
