import { format, startOfMonth, subMonths } from "date-fns"
import { RETURNED_STATUSES } from "@/features/applications/schemas/status"
import type { Application, ApplicationStatus } from "@/features/applications/types"
import type { DashboardSummary } from "@/features/dashboard/schemas/dashboard"
import { acceptedOffer, DAY, median } from "../timeline"
import { daysAtStep, type DashboardContext, oldestDays, totalOf, withStatus } from "./context"

type Insights = NonNullable<DashboardSummary["insights"]>

/** How many months the volume chart covers. */
const MONTHS = 6

const STAGES: { key: Insights["stages"][number]["key"]; label: string; statuses: ApplicationStatus[] }[] = [
  { key: "intake", label: "Submitted", statuses: ["submitted"] },
  { key: "verification", label: "Verification", statuses: ["in_verification"] },
  { key: "assessment", label: "Credit assessment", statuses: ["in_assessment"] },
  { key: "approval", label: "Approval", statuses: ["pending_approval"] },
  { key: "returned", label: "Returned to officer", statuses: [...RETURNED_STATUSES] },
  { key: "offer", label: "Offer", statuses: ["approved", "offer_sent"] },
  { key: "handover", label: "Accepted, awaiting handover", statuses: ["offer_accepted"] },
]

/** Where loans are waiting, how fast they move, and monthly volume. For managers and oversight. */
export function buildInsights(ctx: DashboardContext): Insights {
  const stages = STAGES.map((stage) => {
    const apps = withStatus(ctx, ...stage.statuses)
    const days = apps.map((app) => daysAtStep(ctx, app))
    return { ...stage, ...totalOf(apps), avgDays: average(days), oldestDays: oldestDays(ctx, apps) }
  })
  return { stages, turnaround: turnaround(ctx), monthly: monthlyVolume(ctx.apps, ctx.now) }
}

export interface AcceptedLoan {
  app: Application
  /** When the customer accepted, in milliseconds. */
  acceptedAt: number
  /** Days from submission to acceptance. */
  days: number
}

/** Every visible loan the customer has accepted. */
export function acceptedLoans(ctx: DashboardContext): AcceptedLoan[] {
  const loans: AcceptedLoan[] = []
  for (const app of ctx.apps) {
    const offer = acceptedOffer(app)
    if (!offer?.respondedAt || !app.submittedAt) continue

    const acceptedAt = Date.parse(offer.respondedAt)
    loans.push({ app, acceptedAt, days: (acceptedAt - Date.parse(app.submittedAt)) / DAY })
  }
  return loans
}

/** Median days from submission to accepted offer: the last 30 days and the 30 before. */
export function turnaround(ctx: DashboardContext): Insights["turnaround"] {
  const now = ctx.now.getTime()
  const loans = acceptedLoans(ctx)
  const last30 = loans.filter((loan) => loan.acceptedAt > now - 30 * DAY && loan.acceptedAt <= now)
  const previous30 = loans.filter((loan) => loan.acceptedAt > now - 60 * DAY && loan.acceptedAt <= now - 30 * DAY)
  return {
    days: median(last30.map((loan) => loan.days)),
    previousDays: median(previous30.map((loan) => loan.days)),
    count: last30.length,
  }
}

/**
 * Applications per calendar month, oldest first. Counted by submission date unless
 * `dateOf` picks another date (reports use the handover date). Shared with reports.
 */
export function monthlyVolume(
  apps: Application[],
  now = new Date(),
  dateOf: (app: Application) => string | null | undefined = (app) => app.submittedAt,
) {
  const months = []
  for (let i = MONTHS - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i))
    // The current month has no end, so nothing dated later is dropped.
    const end = i === 0 ? null : startOfMonth(subMonths(now, i - 1))
    const inMonth = apps.filter((app) => {
      const at = dateOf(app)
      if (!at) return false
      const date = new Date(at)
      return date >= start && (end === null || date < end)
    })
    months.push({ month: format(start, "yyyy-MM"), label: format(start, "MMM"), ...totalOf(inMonth) })
  }
  return months
}

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  let total = 0
  for (const n of numbers) total += n
  return total / numbers.length
}
