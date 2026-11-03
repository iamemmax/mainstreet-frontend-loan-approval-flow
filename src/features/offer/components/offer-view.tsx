"use client"

import { CircleCheck, CircleX, Clock, Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { BrandMark } from "@/components/shell/app-sidebar"
import { ErrorState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnswerOffer, useOffer } from "@/features/applications/hooks/use-applications"
import type { OfferView as OfferViewData } from "@/features/applications/types"
import { errorMessage } from "@/lib/api/errors"
import { formatDate } from "@/lib/format/date"
import { formatPercent } from "@/lib/format/money"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"
import { CLOSED_LINK } from "../constants"

const CLOSED_ICON = { success: CircleCheck, neutral: CircleX, warning: Clock } as const
const CLOSED_STYLE = {
  success: "border-success/30 bg-success/5 [&>svg]:text-success",
  neutral: "",
  warning: "border-warning/40 bg-warning/5 [&>svg]:text-warning",
} as const

export function OfferView({ token }: { token: string }) {
  const { data: offer, isPending, error, refetch } = useOffer(token)
  const answer = useAnswerOffer(token)
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <BrandMark />
          <span className="text-sm font-semibold">{BRAND.bankName}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden /> Secure offer
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        {error ? (
          <Card>
            <ErrorState error={error} onRetry={() => refetch()} title="We couldn't open this offer" />
          </Card>
        ) : isPending ? (
          <Skeleton className="h-[32rem] w-full" />
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Hello {offer.applicantName.split(" ")[0]},</p>
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                Your {offer.productName} offer{offer.linkStatus === "active" ? " is ready" : ""}
              </h1>
              <p className="text-sm text-muted-foreground">
                Offer <span className="font-mono">{offer.offerNumber}</span> · Reference{" "}
                <span className="font-mono">{offer.reference}</span> · {offer.branchName} branch
              </p>
            </div>

            {offer.linkStatus !== "active" && <ClosedNotice offer={offer} />}

            {offer.linkStatus === "active" &&
              (offer.principal < offer.requestedAmount || offer.tenorMonths !== offer.requestedTenorMonths) && (
                <Alert>
                  <AlertTitle>Your offer differs from your request</AlertTitle>
                  <AlertDescription>
                    You asked for <MoneyText value={offer.requestedAmount} /> over {offer.requestedTenorMonths} months.
                    After review we can offer{" "}
                    <MoneyText value={offer.principal} className="font-semibold text-foreground" /> over{" "}
                    {offer.tenorMonths} months. Accept it below, or speak to your relationship officer.
                  </AlertDescription>
                </Alert>
              )}

            {offer.linkStatus !== "superseded" && (
              <Card>
                <CardHeader>
                  <CardDescription>Monthly repayment</CardDescription>
                  <CardTitle className="tabular text-4xl">
                    <MoneyText value={offer.monthlyRepayment} />
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">for {offer.tenorMonths} months</p>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y rounded-lg border text-sm">
                    {[
                      ["Loan amount", <MoneyText key="p" value={offer.principal} />],
                      ["Interest rate", `${formatPercent(offer.monthlyRateBps / 10_000, 2)} per month (flat)`],
                      ["Total interest", <MoneyText key="i" value={offer.totalInterest} />],
                      ...offer.fees.map((f) => [f.label, <MoneyText key={f.code} value={f.amount} />] as const),
                      [
                        "You receive",
                        <MoneyText key="n" value={offer.principal - offer.totalFees} className="font-semibold" />,
                      ],
                      ["Total to repay", <MoneyText key="t" value={offer.totalRepayable} className="font-semibold" />],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between gap-4 px-4 py-2.5">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {offer.linkStatus === "active" && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <p className="text-sm text-muted-foreground">
                    This offer is valid until{" "}
                    <span className="font-medium text-foreground">{formatDate(offer.expiresAt, "d MMMM yyyy")}</span>.
                  </p>
                  <div className="flex items-start gap-3">
                    <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
                    <Label htmlFor="agree" className="text-sm leading-relaxed font-normal">
                      I have read the offer letter and loan agreement, and I authorise {BRAND.bankShortName} to set up
                      monthly direct debits for the repayments above.
                    </Label>
                  </div>
                  {answer.error && (
                    <p role="alert" className="text-sm text-destructive">
                      {errorMessage(answer.error)}
                    </p>
                  )}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" disabled={answer.isPending} onClick={() => answer.mutate(false)}>
                      Decline offer
                    </Button>
                    <Button disabled={!agreed || answer.isPending} onClick={() => answer.mutate(true)}>
                      {answer.isPending && <Loader2 className="animate-spin" aria-hidden />}
                      Accept offer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {BRAND.bankName} is licensed by the Central Bank of Nigeria. Never share your PIN or OTP with anyone.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

function ClosedNotice({ offer }: { offer: OfferViewData }) {
  const copy = CLOSED_LINK[offer.linkStatus as Exclude<OfferViewData["linkStatus"], "active">]
  const Icon = CLOSED_ICON[copy.tone]
  return (
    <Alert className={cn(CLOSED_STYLE[copy.tone])}>
      <Icon aria-hidden />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.body(offer)}</AlertDescription>
    </Alert>
  )
}
