import type { OfferView } from "@/features/applications/types"

type ClosedStatus = Exclude<OfferView["linkStatus"], "active">

/** What the customer sees when a link can no longer be acted on. */
export const CLOSED_LINK: Record<
  ClosedStatus,
  { tone: "success" | "neutral" | "warning"; title: string; body: (offer: OfferView) => string }
> = {
  accepted: {
    tone: "success",
    title: "You accepted this offer",
    body: () => "Your loan is being prepared for disbursement. We'll text you when the money is in your account.",
  },
  declined: {
    tone: "neutral",
    title: "You declined this offer",
    body: () => "Your relationship officer will be in touch if you'd like different terms.",
  },
  expired: {
    tone: "warning",
    title: "This offer has expired",
    body: (o) =>
      `It was valid until ${new Date(o.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}. Contact ${o.branchName} branch if you'd still like the loan and we'll send a new offer.`,
  },
  superseded: {
    tone: "warning",
    title: "This link has been replaced",
    body: () =>
      "We've sent you a newer offer. Please use the most recent link in your SMS or email; this one can no longer be accepted.",
  },
}
