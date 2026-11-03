import type { Application, RiskRating } from "../types"
import { computeOffer } from "./offer"

export interface ScoreFactor {
  label: string
  points: number
  /** Shown to the approver as a reason behind the rating. */
  detail: string
}

export interface ScoreResult {
  score: number
  riskRating: RiskRating
  recommendation: "approve" | "decline" | "refer"
  dti: number | null
  factors: ScoreFactor[]
}

export const DTI_LIMIT = 0.4

/**
 * Transparent scorecard: a base of 500 adjusted by affordability, KYC and
 * bureau results, tenure and collateral. Every adjustment is a reason the
 * approver can read. Thresholds would come from product set-up.
 */
export function scoreApplication(
  app: Application,
  product: { monthlyRateBps: number; fees: { code: string; label: string; rateBps: number }[] },
): ScoreResult {
  const factors: ScoreFactor[] = []
  const add = (label: string, points: number, detail: string) => factors.push({ label, points, detail })

  const income =
    app.employment?.monthlyNetIncome ?? (app.business ? app.business.monthlyRevenue - app.business.monthlyExpenses : 0)
  const expenses = app.assessment?.monthlyExpenses ?? 0
  const existing = app.assessment?.existingLoanRepayments ?? 0
  const repayment = computeOffer(product, app.amountRequested, app.tenorMonths).monthlyRepayment
  const disposable = income - expenses
  const dti = disposable > 0 ? (repayment + existing) / disposable : null

  if (dti === null) add("Affordability", -200, "No disposable income after expenses")
  else if (dti <= 0.25) add("Affordability", 160, `Debt service is ${(dti * 100).toFixed(0)}% of disposable income`)
  else if (dti <= DTI_LIMIT)
    add(
      "Affordability",
      80,
      `Debt service is ${(dti * 100).toFixed(0)}% of disposable income, within the ${DTI_LIMIT * 100}% limit`,
    )
  else
    add(
      "Affordability",
      -150,
      `Debt service is ${(dti * 100).toFixed(0)}% of disposable income, above the ${DTI_LIMIT * 100}% limit`,
    )

  const v = app.verification
  const failed = v.filter((r) => r.status === "failed")
  const review = v.filter((r) => r.status === "review")
  if (failed.length) add("Identity & KYC", -250, `${failed.length} check${failed.length > 1 ? "s" : ""} failed`)
  else if (v.some((r) => r.kind === "bvn" && r.status === "passed"))
    add("Identity & KYC", 60, "BVN, NIN and phone verified")

  const bureau = v.filter((r) => r.kind.startsWith("bureau_"))
  if (bureau.some((r) => r.status !== "passed")) add("Credit bureau", -90, "Past-due facility reported by a bureau")
  else if (bureau.length) add("Credit bureau", 70, "Clean report from all bureaus")

  if (review.some((r) => r.kind === "pep_sanctions"))
    add("Screening", -120, "Possible PEP match needs enhanced due diligence")
  if (review.some((r) => r.kind === "bank_statement")) add("Bank statement", -40, "Irregular inflows in the statement")

  if (app.employment) {
    const years = (Date.now() - new Date(app.employment.employmentStartDate).getTime()) / (365.25 * 86_400_000)
    if (years >= 3) add("Employment", 50, `${Math.floor(years)} years with current employer`)
    else if (years < 1) add("Employment", -40, "Less than a year with current employer")
  }
  if (app.applicant.kind === "business") {
    const y = app.applicant.yearsInOperation
    if (y >= 3) add("Business tenure", 50, `${y} years in operation`)
    else if (y < 1) add("Business tenure", -60, "Less than a year in operation")
    const cover = app.collateral.reduce((t, c) => t + (c.forcedSaleValue ?? c.estimatedValue), 0) / app.amountRequested
    if (cover >= 1) add("Collateral", 60, `Forced-sale value covers ${(cover * 100).toFixed(0)}% of the loan`)
    else if (app.collateral.length) add("Collateral", 10, `Collateral covers ${(cover * 100).toFixed(0)}% of the loan`)
    else add("Collateral", -60, "No collateral pledged")
  }
  if (app.guarantors.length === 0) add("Guarantors", -50, "No guarantor recorded")

  const score = Math.max(0, Math.min(1000, 500 + factors.reduce((t, f) => t + f.points, 0)))
  let riskRating: RiskRating = "high"
  if (score >= 700) riskRating = "low"
  else if (score >= 550) riskRating = "medium"

  // Any failed check, or repayments over 60% of income, means decline.
  let recommendation: "approve" | "refer" | "decline" = "refer"
  if (failed.length > 0 || (dti !== null && dti > 0.6)) recommendation = "decline"
  else if (riskRating === "low") recommendation = "approve"
  return { score, riskRating, recommendation, dti, factors }
}
