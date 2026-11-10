import type { Application, ApplicationStatus } from "@/features/applications/types"
import type { DashboardSummary } from "@/features/dashboard/schemas/dashboard"
import type { DashboardFocus } from "@/lib/rbac/profiles"
import { auditIndex, HANDOVER_ACTIONS, VERIFIED_ACTIONS } from "../timeline"
import { daysAtStep, type DashboardContext, withStatus } from "./context"
import { monthlyVolume } from "./insights"

type Charts = NonNullable<DashboardSummary["charts"]>
type BreakdownRow = Charts["breakdown"]["rows"][number]

/** Where a relationship officer's applications are now, in the order they move. */
const OFFICER_STAGES: { key: string; label: string; statuses: ApplicationStatus[]; tone: BreakdownRow["tone"] }[] = [
  { key: "draft", label: "Drafts", statuses: ["draft"], tone: "neutral" },
  { key: "verification", label: "In verification", statuses: ["submitted", "in_verification"], tone: "neutral" },
  { key: "assessment", label: "In assessment", statuses: ["in_assessment"], tone: "neutral" },
  { key: "approval", label: "In approval", statuses: ["pending_approval"], tone: "neutral" },
  { key: "returned", label: "Returned to you", statuses: ["returned", "more_info_requested"], tone: "warning" },
  { key: "offer", label: "Offer to send or out", statuses: ["approved", "offer_sent"], tone: "neutral" },
  { key: "accepted", label: "Accepted", statuses: ["offer_accepted", "ready_for_disbursement"], tone: "neutral" },
]

/** How long a queue has waited, in steps that matter to a team working to a one-to-two-day turnaround. */
const AGE_BUCKETS: { key: string; label: string; under: number; tone: BreakdownRow["tone"] }[] = [
  { key: "today", label: "Under a day", under: 1, tone: "neutral" },
  { key: "days", label: "1 to 2 days", under: 2, tone: "neutral" },
  { key: "week", label: "2 to 7 days", under: 7, tone: "warning" },
  { key: "older", label: "Over a week", under: Infinity, tone: "danger" },
]

/** The two charts for roles without insights; managers and oversight have the volume and stage charts instead. */
export function buildCharts(ctx: DashboardContext, focus: DashboardFocus): Charts | null {
  const latest = auditIndex(ctx.store)
  switch (focus) {
    case "origination":
      return {
        activity: {
          title: "Your applications",
          description: "Submitted each month, last 6 months",
          unit: "applications",
          months: monthlyVolume(ctx.mine, ctx.now),
        },
        breakdown: {
          title: "Where your applications are",
          description: "Every application you own, by its step now",
          rows: officerStages(ctx.mine),
        },
      }
    case "verification":
      return {
        activity: {
          title: "Files verified",
          description: "Verification completed each month, last 6 months",
          unit: "files",
          months: monthlyVolume(ctx.apps, ctx.now, (app) => latest(app.id, VERIFIED_ACTIONS)),
        },
        breakdown: queueAge(ctx, "How long the queue has waited", ["submitted", "in_verification"]),
      }
    case "assessment":
      return {
        activity: {
          title: "Files assessed",
          description: "Assessments saved each month, last 6 months",
          unit: "files",
          months: monthlyVolume(ctx.apps, ctx.now, (app) => app.assessment?.updatedAt),
        },
        breakdown: queueAge(ctx, "How long the queue has waited", ["in_assessment"]),
      }
    case "finance":
      return {
        activity: {
          title: "Loans handed over",
          description: "Handed to finance each month, last 6 months",
          unit: "loans",
          months: monthlyVolume(ctx.apps, ctx.now, (app) => latest(app.id, HANDOVER_ACTIONS)),
        },
        breakdown: queueAge(ctx, "How long accepted loans have waited", ["offer_accepted"]),
      }
    default:
      return null
  }
}

function officerStages(apps: Application[]): BreakdownRow[] {
  return OFFICER_STAGES.map(({ key, label, statuses, tone }) => ({
    key,
    label,
    tone,
    count: apps.filter((app) => statuses.includes(app.status)).length,
  }))
}

/** The applications at these statuses, counted by how long they have been at their step. */
function queueAge(ctx: DashboardContext, title: string, statuses: ApplicationStatus[]): Charts["breakdown"] {
  const counts = AGE_BUCKETS.map(() => 0)
  for (const app of withStatus(ctx, ...statuses)) {
    const days = daysAtStep(ctx, app)
    counts[AGE_BUCKETS.findIndex((bucket) => days < bucket.under)]++
  }
  return {
    title,
    description: "Applications waiting now, by time at this step",
    rows: AGE_BUCKETS.map(({ key, label, tone }, i) => ({ key, label, tone, count: counts[i] })),
  }
}
