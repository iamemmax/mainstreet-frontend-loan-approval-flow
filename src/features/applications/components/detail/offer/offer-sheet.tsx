"use client"

import { CircleCheck, ExternalLink, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { MoneyText } from "@/components/shared/money-text"
import { ToneBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useReferenceData, useUsers } from "@/features/admin/hooks/use-reference-data"
import { useAuditEvents } from "@/features/audit/hooks/use-audit-events"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import { useIsOnDesk } from "../../../hooks/use-is-on-desk"
import { APPROVED_STATUSES, OFFER_ADJUSTABLE_STATUSES } from "../../../schemas/status"
import type { Application } from "../../../types"
import { computeOffer, currentOffer, isOfferExpired, offeredTerms } from "../../../utils/offer"
import { AdjustOfferDialog } from "../adjust-offer-dialog"
import { OFFER_STEPS } from "../constants"
import { type ProductInfo, Section } from "../ui"
import { OfferHistory } from "./offer-history"
import { offerStatusLine } from "./status-line"
import { Schedule } from "./schedule"

/** How far the offer has got: 0 before approval, then one step per stage of OFFER_STEPS. */
const OFFER_REACHED: Partial<Record<Application["status"], number>> = {
  approved: 1,
  offer_sent: 2,
  offer_accepted: 3,
  ready_for_disbursement: 4,
}

/** The circle style for one offer step: done, the current one, or still to come. */
function stepCircleClass(done: boolean, current: boolean): string {
  if (done) return "border-success bg-success text-white"
  if (current) return "border-primary text-primary"
  return "text-muted-foreground"
}

/** The line under an offer step: when it happened, "Next", or a dash. */
function stepNote(done: boolean, current: boolean, date: string | null | undefined): string {
  if (done && date) return formatDate(date, "d MMM yyyy")
  if (current) return "Next"
  return "—"
}

interface OfferSheetProps {
  app: Application
  product: ProductInfo
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The offer in a side sheet: where it stands, every offer issued, and the repayment schedule once approved. */
export function OfferSheet({ app, product, open, onOpenChange }: OfferSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 bg-background p-0 sm:max-w-3xl">
        <SheetHeader className="border-b bg-card px-6 py-4">
          <SheetTitle>Offer</SheetTitle>
          <SheetDescription>{app.reference}</SheetDescription>
        </SheetHeader>
        <div className="@container min-h-0 flex-1 overflow-y-auto p-5">
          <OfferDetails app={app} product={product} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OfferDetails({ app, product }: { app: Application; product: ProductInfo }) {
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
  const reached = OFFER_REACHED[app.status] ?? 0
  const offer = currentOffer(app)
  const sentAt = offer?.sentAt
  const dates = [
    app.workflow?.decisions.filter((d) => d.action === "approve").at(-1)?.at,
    sentAt,
    offer?.status === "accepted" ? offer.respondedAt : null,
    at("handover.ready", "application.mark_ready"),
  ]
  const expired = app.status === "offer_sent" && !!offer && isOfferExpired(offer)
  const indicative = reached === 0
  // A schedule only means something once the loan is approved.
  const showSchedule = APPROVED_STATUSES.includes(app.status)

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 px-6 py-5 @xl:flex-row @xl:items-center @xl:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">
              {indicative ? "Indicative terms" : "Offer progress"}
              {offer && (
                <span className="ml-2 font-mono text-sm font-medium text-muted-foreground">{offer.number}</span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">{offerStatusLine(app)}</p>
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
                      stepCircleClass(done, current),
                    )}
                  >
                    {done ? <CircleCheck className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <div>
                    <div className={cn("text-sm font-semibold", !done && !current && "text-muted-foreground")}>
                      {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{stepNote(done, current, dates[i])}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      {app.offers.length > 0 && <OfferHistory offers={app.offers} />}

      {showSchedule && (
        <Section
          title="Repayment schedule"
          description="Equal monthly instalments, due on the same day each month"
          flush
        >
          <Schedule terms={terms} start={new Date(sentAt ?? app.updatedAt)} />
        </Section>
      )}
      {canAdjust && fullProduct && (
        <AdjustOfferDialog app={app} product={fullProduct} open={adjusting} onOpenChange={setAdjusting} />
      )}
    </div>
  )
}
