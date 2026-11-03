"use client"

import { ClipboardList, Save } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { usePinConfirm } from "@/components/shared/pin-confirm"
import { RiskBadge, ToneBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { useCan } from "@/features/auth/hooks/use-session"
import { formatDateTime } from "@/lib/format/date"
import { formatNaira, formatPercent, koboToNaira, nairaToKobo } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { useSaveAssessment } from "../../../hooks/use-applications"
import { useIsOnDesk } from "../../../hooks/use-is-on-desk"
import { ASSESSABLE_STATUSES } from "../../../schemas/status"
import type { Application } from "../../../types"
import { computeOffer } from "../../../utils/offer"
import { summariseCreditHistory } from "../../../utils/credit-history"
import { DTI_LIMIT, scoreApplication } from "../../../utils/scorecard"
import { RECOMMENDATIONS } from "../constants"
import { Affordability } from "./assessment/affordability"
import { Scorecard } from "./assessment/scorecard"
import { DtiMeter } from "./assessment/dti-meter"
import { NairaField } from "./assessment/naira-field"

interface ProductPricing {
  monthlyRateBps: number
  fees: { code: string; label: string; rateBps: number }[]
}

export function AssessmentTab({ app, product }: { app: Application; product: ProductPricing }) {
  const onDesk = useIsOnDesk(app)
  const canEdit = useCan("assessment:edit") && ASSESSABLE_STATUSES.includes(app.status) && onDesk
  const save = useSaveAssessment(app.id)
  const pin = usePinConfirm()
  const { data: users } = useUsers()
  const [expenses, setExpenses] = useState(app.assessment ? String(koboToNaira(app.assessment.monthlyExpenses)) : "")
  const [existing, setExisting] = useState(
    app.assessment ? String(koboToNaira(app.assessment.existingLoanRepayments)) : "0",
  )
  const [recommendation, setRecommendation] = useState<"approve" | "decline" | "refer" | "">(
    app.assessment?.recommendation ?? "",
  )
  const [notes, setNotes] = useState(app.assessment?.notes ?? "")

  // Score the inputs live, so the analyst sees the effect before saving.
  const draft: Application = {
    ...app,
    assessment: {
      monthlyExpenses: nairaToKobo(Number(expenses || 0)),
      existingLoanRepayments: nairaToKobo(Number(existing || 0)),
      recommendation: recommendation || null,
      notes,
      updatedAt: "",
      updatedById: "",
    },
  }
  const result = scoreApplication(draft, product)
  const income =
    app.employment?.monthlyNetIncome ?? (app.business ? app.business.monthlyRevenue - app.business.monthlyExpenses : 0)
  const repayment = computeOffer(product, app.amountRequested, app.tenorMonths).monthlyRepayment
  const expensesK = nairaToKobo(Number(expenses || 0))
  const existingK = nairaToKobo(Number(existing || 0))
  const bureauMonthly = app.creditHistory ? summariseCreditHistory(app.creditHistory).monthly : null
  const disposable = income - expensesK
  // How much more could be repaid before debt service passes the policy limit.
  const headroom = Math.round(disposable * DTI_LIMIT) - existingK - repayment
  const by = users?.find((u) => u.id === app.assessment?.updatedById)?.name
  const dirty =
    !app.assessment ||
    expensesK !== app.assessment.monthlyExpenses ||
    existingK !== app.assessment.existingLoanRepayments ||
    (recommendation || null) !== app.assessment.recommendation ||
    notes.trim() !== app.assessment.notes
  const REC_LABEL = { approve: "Approve", refer: "Approve with conditions", decline: "Decline" } as const
  const dtiOver = result.dti !== null && result.dti > DTI_LIMIT
  const saved = RECOMMENDATIONS.find((r) => r.value === app.assessment?.recommendation)

  // Only the analyst works the form; everyone else reads the result.
  if (!canEdit && !app.assessment) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList aria-hidden />}
          title="Not assessed yet"
          description="The credit analyst's affordability check, score and recommendation will show here once saved."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <dl className="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-4 [&>div]:px-6 [&>div]:py-5 @3xl:[&>div:not(:last-child)]:border-r @max-3xl:[&>div]:border-b @lg:@max-3xl:[&>div:nth-child(odd)]:border-r [&>div]:border-border/70">
          <div>
            <dt className="text-[13px] text-muted-foreground">Credit score</dt>
            <dd className="mt-1.5 flex items-center gap-3">
              <span className="tabular text-[1.75rem] leading-none font-bold">{result.score}</span>
              <RiskBadge rating={result.riskRating} />
            </dd>
            <dd className="mt-2 text-xs text-muted-foreground">Out of 1000 · base 500</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Repayments vs income</dt>
            <dd className={cn("tabular mt-1.5 text-[1.75rem] leading-none font-bold", dtiOver && "text-destructive")}>
              {result.dti === null ? "—" : formatPercent(result.dti, 0)}
            </dd>
            <dd className="mt-3">
              <DtiMeter dti={result.dti} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Spare before the limit</dt>
            <dd
              className={cn(
                "tabular mt-1.5 text-[1.75rem] leading-none font-bold",
                headroom < 0 ? "text-destructive" : "text-success",
              )}
            >
              <MoneyText value={Math.abs(headroom)} format="compact" />
              {headroom < 0 && <span className="ml-1 text-sm font-semibold">over</span>}
            </dd>
            <dd className="mt-2 text-xs text-muted-foreground">
              {headroom < 0 ? `A month over the ${formatPercent(DTI_LIMIT, 0)} limit` : `A month more it could repay`}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">System recommends</dt>
            <dd className="mt-1.5 text-lg leading-tight font-bold">{REC_LABEL[result.recommendation]}</dd>
            <dd className="mt-2 text-xs text-muted-foreground">From the product scorecard</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-5 @4xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Can they afford it?</CardTitle>
            <CardDescription>
              All loan repayments together should take no more than {formatPercent(DTI_LIMIT, 0)} of the money left
              after living costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* The worked-out table below already shows the saved figures to readers. */}
            {canEdit && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NairaField
                  label="Monthly living costs"
                  value={expenses}
                  onChange={setExpenses}
                  hint={app.business ? "Operating costs not already in cash flow" : "Rent, transport, food, dependants"}
                />
                <NairaField
                  label="Other loan repayments"
                  value={existing}
                  onChange={setExisting}
                  hint={
                    bureauMonthly !== null
                      ? `Credit history shows ${formatNaira(bureauMonthly)} a month`
                      : "Monthly, from the bureau reports"
                  }
                />
              </div>
            )}
            <Affordability
              income={income}
              expenses={expensesK}
              existing={existingK}
              repayment={repayment}
              business={!!app.business}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Scorecard</CardTitle>
            <CardDescription>How the score was reached</CardDescription>
            <CardAction>
              <span className="tabular text-sm text-muted-foreground">
                500 <span className="mx-1">→</span>
                <span className="font-semibold text-foreground">{result.score}</span>
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Scorecard factors={result.factors} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Analyst recommendation</CardTitle>
          <CardDescription>
            {app.assessment
              ? `Last saved by ${by ?? "—"} on ${formatDateTime(app.assessment.updatedAt)}`
              : "Not assessed yet"}
          </CardDescription>
        </CardHeader>
        {!canEdit && app.assessment ? (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {saved ? (
                <ToneBadge tone={saved.tone}>{saved.label}</ToneBadge>
              ) : (
                <ToneBadge tone="neutral">No recommendation</ToneBadge>
              )}
              {saved && <span className="text-sm text-muted-foreground">{saved.hint}</span>}
            </div>
            <div>
              <div className="text-[13px] text-muted-foreground">Notes for approvers</div>
              <p className="mt-1 text-sm whitespace-pre-line">{app.assessment.notes || "—"}</p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-5">
            <div role="radiogroup" aria-label="Recommendation" className="grid gap-3 @2xl:grid-cols-3">
              {RECOMMENDATIONS.map((r) => {
                const on = recommendation === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRecommendation(r.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                        on ? "border-primary" : "border-input",
                      )}
                    >
                      {on && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{r.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{r.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="analyst-notes" className="text-[13px]">
                  Notes for approvers
                </Label>
                <span className="tabular text-xs text-muted-foreground">
                  {notes.trim().length} characters · at least 10
                </span>
              </div>
              <Textarea
                id="analyst-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Affordability, conditions, mitigants…"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
              {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
              <Button
                disabled={!dirty || !expenses || !recommendation || notes.trim().length < 10}
                onClick={() =>
                  pin.confirm({
                    title: "Save assessment",
                    icon: Save,
                    description:
                      "Approvers see this assessment and your recommendation. The application is re-scored when you save.",
                    facts: [
                      { label: "Application", value: <span className="font-mono">{app.reference}</span> },
                      {
                        label: "Recommendation",
                        value: RECOMMENDATIONS.find((r) => r.value === recommendation)?.label,
                      },
                      { label: "Risk", value: <RiskBadge rating={result.riskRating} /> },
                    ],
                    confirmLabel: "Save assessment",
                    run: async (p) => {
                      await save.mutateAsync({
                        input: {
                          monthlyExpenses: expensesK,
                          existingLoanRepayments: existingK,
                          recommendation: recommendation || null,
                          notes: notes.trim(),
                        },
                        pin: p,
                      })
                      toast.success("Assessment saved")
                    },
                  })
                }
              >
                <Save aria-hidden />
                Save assessment
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
