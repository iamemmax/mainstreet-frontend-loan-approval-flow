"use client"

import { Loader2, SlidersHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { MODAL_CONTENT, ModalBody, ModalFooter, ModalHeader, ModalNote } from "@/components/shared/modal"
import { MoneyText } from "@/components/shared/money-text"
import { NumberInput } from "@/components/shared/number-input"
import { usePinConfirm } from "@/components/shared/pin-confirm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Product } from "@/features/admin/types"
import { formatNaira, formatPercent, koboToNaira, nairaToKobo } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { useAdjustOffer } from "../../hooks/use-applications"
import type { Application } from "../../types"
import { computeOffer, offeredTerms } from "../../utils/offer"
import { DTI_LIMIT } from "../../utils/scorecard"

/** Quick picks as a share of what was asked for. */
const SHARES = [1, 0.9, 0.75, 0.5] as const

interface AdjustOfferDialogProps {
  app: Application
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Offer less than was asked, or a different tenor. Shows the effect on the repayment before the PIN. */
export function AdjustOfferDialog({ app, product, open, onOpenChange }: AdjustOfferDialogProps) {
  const current = offeredTerms(app)
  const [amount, setAmount] = useState(String(koboToNaira(current.amount)))
  const [tenor, setTenor] = useState(String(current.tenorMonths))
  const [reason, setReason] = useState("")
  const adjust = useAdjustOffer(app.id)
  const pin = usePinConfirm()

  useEffect(() => {
    if (!open) return
    setAmount(String(koboToNaira(current.amount)))
    setTenor(String(current.tenorMonths))
    setReason("")
  }, [open, current.amount, current.tenorMonths])

  const amountK = nairaToKobo(Number(amount || 0))
  const tenorN = Number(tenor)
  const requested = computeOffer(product, app.amountRequested, app.tenorMonths)
  const proposed = amountK > 0 ? computeOffer(product, amountK, tenorN) : null
  // Same test as the assessment: all loan repayments against what's left after living costs.
  const income =
    app.employment?.monthlyNetIncome ?? (app.business ? app.business.monthlyRevenue - app.business.monthlyExpenses : 0)
  const left = income - (app.assessment?.monthlyExpenses ?? 0)
  const share =
    proposed && app.assessment && left > 0
      ? (app.assessment.existingLoanRepayments + proposed.monthlyRepayment) / left
      : null

  const error =
    amountK > app.amountRequested
      ? "The offer can't be more than the customer asked for."
      : amountK < product.minAmount
        ? `${product.name} lends at least ${formatNaira(product.minAmount)}.`
        : amountK === current.amount && tenorN === current.tenorMonths
          ? "Change the amount or the tenor."
          : null
  const ready = !error && reason.trim().length >= 10

  const confirm = () =>
    pin.confirm({
      title: "Confirm the new offer",
      icon: SlidersHorizontal,
      description:
        app.status === "offer_sent"
          ? "The customer gets a new offer link with these terms; the current link stops working."
          : "These terms go into the offer letter when it's sent.",
      facts: [
        { label: "Amount", value: <MoneyText value={amountK} /> },
        { label: "Tenor", value: `${tenorN} months` },
        { label: "Monthly repayment", value: proposed ? <MoneyText value={proposed.monthlyRepayment} /> : "—" },
        { label: "Requested", value: <MoneyText value={app.amountRequested} /> },
      ],
      confirmLabel: "Change offer",
      run: async (p) => {
        await adjust.mutateAsync({ input: { amount: amountK, tenorMonths: tenorN, reason: reason.trim() }, pin: p })
        onOpenChange(false)
        toast.success(app.status === "offer_sent" ? "Offer changed and re-sent to the customer" : "Offer terms updated")
      },
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(MODAL_CONTENT, "sm:max-w-[560px]")}>
        <ModalHeader
          icon={SlidersHorizontal}
          title="Adjust the offer"
          description="Offer less than was asked for, or change the tenor. The customer only sees the new terms."
          meta={[
            <span key="r" className="font-mono">
              {app.reference}
            </span>,
            <span key="a">
              Asked for <MoneyText value={app.amountRequested} /> · {app.tenorMonths} months
            </span>,
          ]}
        />
        <ModalBody>
          <div className="space-y-2">
            <Label htmlFor="offer-amount">Amount to offer (₦)</Label>
            <NumberInput
              id="offer-amount"
              className="text-base font-semibold"
              value={amount}
              onValueChange={setAmount}
              aria-invalid={!!error && error.includes("lends") ? true : amountK > app.amountRequested}
            />
            <div className="flex flex-wrap gap-1.5">
              {SHARES.map((s) => {
                const value = Math.max(product.minAmount, Math.round((app.amountRequested * s) / 1_000_000) * 1_000_000)
                const on = amountK === value
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAmount(String(koboToNaira(value)))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      on
                        ? "border-primary/30 bg-primary/[0.07] text-primary"
                        : "text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {s === 1 ? "Full amount" : `${s * 100}%`} · {formatNaira(value, "compact")}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-tenor">Tenor</Label>
            <Select value={tenor} onValueChange={setTenor}>
              <SelectTrigger id="offer-tenor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Array.from(
                  { length: product.maxTenorMonths - product.minTenorMonths + 1 },
                  (_, i) => product.minTenorMonths + i,
                ).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} months{m === app.tenorMonths ? " · as asked" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asked for vs. offered, so the effect is plain before anyone signs. */}
          <div className="overflow-hidden rounded-xl border border-border/80 text-sm">
            <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              <span />
              <span className="text-right">Asked for</span>
              <span className="text-right">Offer</span>
            </div>
            {(
              [
                ["Amount", app.amountRequested, amountK],
                ["Monthly repayment", requested.monthlyRepayment, proposed?.monthlyRepayment ?? 0],
                ["Total to repay", requested.totalRepayable, proposed?.totalRepayable ?? 0],
              ] as const
            ).map(([label, a, b]) => (
              <div key={label} className="grid grid-cols-3 border-t border-border/60 px-4 py-2.5">
                <span className="text-muted-foreground">{label}</span>
                <MoneyText value={a} className="text-right text-muted-foreground" />
                <MoneyText value={b} className={cn("text-right font-semibold", b < a && "text-success")} />
              </div>
            ))}
            {share !== null && (
              <div
                className={cn(
                  "border-t px-4 py-2.5 text-[13px]",
                  share > DTI_LIMIT ? "bg-warning/10 text-warning" : "bg-success/[0.06] text-success",
                )}
              >
                With this offer, loan repayments take {formatPercent(share, 0)} of what&apos;s left after living costs (
                {share > DTI_LIMIT ? "above" : "within"} the {formatPercent(DTI_LIMIT, 0)} limit).
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-reason">Reason</Label>
            <Textarea
              id="offer-reason"
              rows={2}
              placeholder="e.g. Reduced to keep repayments within affordability"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <ModalNote tone="warning">{error}</ModalNote>}
          {!error && app.status === "offer_sent" && (
            <ModalNote tone="warning">
              The current offer link stops working. The customer gets a new link with these terms.
            </ModalNote>
          )}
        </ModalBody>
        <ModalFooter aside="Signed with your PIN and recorded in the audit trail">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ready || adjust.isPending} onClick={confirm}>
            {adjust.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Continue
          </Button>
        </ModalFooter>
      </DialogContent>
    </Dialog>
  )
}
