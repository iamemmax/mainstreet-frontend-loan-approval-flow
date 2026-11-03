"use client"

import { CircleCheck, ExternalLink, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { MoneyText } from "@/components/shared/money-text"
import { ToneBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useReferenceData, useUsers } from "@/features/admin/hooks/use-reference-data"
import { useAuditEvents } from "@/features/audit/hooks/use-audit-events"
import { formatDate, formatRelative } from "@/lib/format/date"
import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { useIsOnDesk } from "../../../hooks/use-is-on-desk"
import { OFFER_ADJUSTABLE_STATUSES } from "../../../schemas/status"
import type { Application } from "../../../types"
import { computeOffer, currentOffer, isOfferExpired, offeredTerms } from "../../../utils/offer"
import { AdjustOfferDialog } from "../adjust-offer-dialog"
import { OFFER_STEPS } from "../constants"
import { type ProductInfo, Section } from "../ui"
import { OfferHistory } from "./offer/offer-history"
import { CostBar, PriceRow } from "./offer/cost-bar"
import { Schedule } from "./offer/schedule"

/** One line under the heading saying where the offer stands. */
function offerStatusLine(app: Application, expires: Date | null, expired: boolean): string {
  if (expired && expires) {
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

/** The terms on offer, how far the offer has got, and its pricing and schedule. */
export function OfferTab({ app, product }: { app: Application; product: ProductInfo }) {
  const offered = offeredTerms(app)
  const terms = computeOffer(product, offered.amount, offered.tenorMonths)
  const { data: ref } = useReferenceData()
  const { data: users } = useUsers()
  const fullProduct = ref?.products.find((p) => p.id === app.productId)
  // Any step may adjust the offer, but only the person who has the application right now.
  const onDesk = useIsOnDesk(app)
  const canAdjust = onDesk && OFFER_ADJUSTABLE_STATUSES.includes(app.status) && !!fullProduct
  const [adjusting, setAdjusting] = useState(false)
  const { data: events } = useAuditEvents({ entityId: app.id, pageSize: 100 })
  const at = (...actions: string[]) => events?.items.find((e) => actions.includes(e.action))?.at
  const reached =
    { approved: 1, offer_sent: 2, offer_accepted: 3, ready_for_disbursement: 4 }[app.status as string] ?? 0
  const offer = currentOffer(app)
  const sentAt = offer?.sentAt
  const dates = [
    app.workflow?.decisions.filter((d) => d.action === "approve").at(-1)?.at,
    sentAt,
    offer?.status === "accepted" ? offer.respondedAt : null,
    at("handover.ready", "application.mark_ready"),
  ]
  const expires = offer ? new Date(offer.expiresAt) : null
  const expired = app.status === "offer_sent" && !!offer && isOfferExpired(offer)
  const indicative = reached === 0

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">
              {indicative ? "Indicative terms" : "Offer progress"}
              {offer && (
                <span className="ml-2 font-mono text-sm font-medium text-muted-foreground">{offer.number}</span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">{offerStatusLine(app, expires, expired)}</p>
          </div>
          {(canAdjust || (app.status === "offer_sent" && offer)) && (
            <div className="flex items-center gap-2">
              {expired && <ToneBadge tone="danger">Expired</ToneBadge>}
              {canAdjust && (
                <Button variant="outline" onClick={() => setAdjusting(true)}>
                  <SlidersHorizontal aria-hidden /> Adjust offer
                </Button>
              )}
              {app.status === "offer_sent" && offer && (
                <Button variant="outline" asChild>
                  <Link href={`/offer/${offer.token}`} target="_blank">
                    Preview <ExternalLink aria-hidden />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
        {app.offerTerms && (
          <div className="flex items-start gap-3 border-t bg-warning/[0.06] px-6 py-3.5 text-sm">
            <SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-semibold">Offer differs from the request.</span> Asked for{" "}
              <MoneyText value={app.amountRequested} /> over {app.tenorMonths} months; offering{" "}
              <MoneyText value={app.offerTerms.amount} className="font-semibold" /> over {app.offerTerms.tenorMonths}{" "}
              months.{" "}
              <span className="text-muted-foreground">
                &ldquo;{app.offerTerms.reason}&rdquo; ·{" "}
                {users?.find((u) => u.id === app.offerTerms!.setById)?.name ?? "—"},{" "}
                {formatDate(app.offerTerms.setAt, "d MMM yyyy")}
              </span>
            </p>
          </div>
        )}
        {!indicative && (
          <ol className="grid grid-cols-2 border-t @2xl:grid-cols-4 [&>li]:border-border/70 [&>li]:px-6 [&>li]:py-4 @2xl:[&>li:not(:last-child)]:border-r @max-2xl:[&>li:nth-child(odd)]:border-r @max-2xl:[&>li:nth-child(-n+2)]:border-b">
            {OFFER_STEPS.map((s, i) => {
              const done = i < reached
              const current = i === reached
              return (
                <li key={s.key} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                      done
                        ? "border-success bg-success text-white"
                        : current
                          ? "border-primary text-primary"
                          : "text-muted-foreground",
                    )}
                  >
                    {done ? <CircleCheck className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <div>
                    <div className={cn("text-sm font-semibold", !done && !current && "text-muted-foreground")}>
                      {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {done && dates[i] ? formatDate(dates[i]!, "d MMM yyyy") : current ? "Next" : "—"}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      {app.offers.length > 0 && <OfferHistory offers={app.offers} />}

      <Section
        title="Pricing"
        description={`${product.name} · ${formatPercent(terms.monthlyRateBps / 10_000, 2)} flat per month`}
      >
        <div className="grid gap-8 @3xl:grid-cols-2 @3xl:items-center">
          <div className="space-y-5">
            <div>
              <div className="text-[13px] text-muted-foreground">Monthly repayment</div>
              <div className="tabular text-[2rem] leading-tight font-bold tracking-tight">
                <MoneyText value={terms.monthlyRepayment} />
              </div>
              <div className="text-[13px] text-muted-foreground">for {terms.tenorMonths} months</div>
            </div>
            <CostBar terms={terms} />
          </div>
          <dl className="divide-y rounded-xl border border-border/80 text-sm">
            <PriceRow label="Principal" value={terms.principal} />
            <PriceRow label={`Interest · ${terms.tenorMonths} months`} value={terms.totalInterest} />
            <PriceRow label="Total repayable" value={terms.totalRepayable} strong />
            {terms.fees.map((f) => (
              <PriceRow key={f.code} label={`${f.label} · upfront`} value={-f.amount} />
            ))}
            <PriceRow label="Customer receives" value={terms.principal - terms.totalFees} strong />
          </dl>
        </div>
      </Section>

      <Section title="Repayment schedule" description="Equal monthly instalments, due on the same day each month" flush>
        <Schedule terms={terms} start={new Date(sentAt ?? app.updatedAt)} />
      </Section>
      {canAdjust && fullProduct && (
        <AdjustOfferDialog app={app} product={fullProduct} open={adjusting} onOpenChange={setAdjusting} />
      )}
    </div>
  )
}
