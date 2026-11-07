import { startOfMonth } from "date-fns"
import { APPROVED_STATUSES } from "@/features/applications/schemas/status"
import type { ApplicationStatus } from "@/features/applications/types"
import type { DashboardFigure } from "@/features/dashboard/schemas/dashboard"
import { authorityLimitForStage } from "@/features/workflow/engine"
import { formatNaira, pluralize } from "@/lib/format/money"
import type { DashboardFocus } from "@/lib/rbac/profiles"
import { acceptedOffer, DAY, median, VERIFIED_ACTIONS } from "../timeline"
import {
  type DashboardContext,
  HANDOVER_LATE_DAYS,
  hasFlaggedCheck,
  isOfferExpiringSoon,
  isReturned,
  listItem,
  oldestDays,
  sinceOf,
  totalOf,
  withStatus,
} from "./context"
import { acceptedLoans, turnaround } from "./insights"

/** Statuses that are no longer in progress for the pipeline figure. */
const OUT_OF_PIPELINE: ApplicationStatus[] = ["draft", "rejected", "ready_for_disbursement"]

/** The four headline numbers for this user's team. */
export function buildFigures(ctx: DashboardContext, focus: DashboardFocus): DashboardFigure[] {
  switch (focus) {
    case "origination":
      return originationFigures(ctx)
    case "verification":
      return verificationFigures(ctx)
    case "assessment":
      return assessmentFigures(ctx)
    case "approval":
      return approvalFigures(ctx)
    case "finance":
      return financeFigures(ctx)
    case "oversight":
      return oversightFigures(ctx)
  }
}

function figure(
  key: DashboardFigure["key"],
  value: number | null,
  note: string,
  options: { tone?: DashboardFigure["tone"]; previous?: number | null } = {},
): DashboardFigure {
  return { key, value, note, tone: options.tone ?? "neutral", previous: options.previous ?? null }
}

/** Relationship officer: their drafts, returns and offers. */
function originationFigures(ctx: DashboardContext): DashboardFigure[] {
  const monthStart = startOfMonth(ctx.now).getTime()
  const drafts = ctx.mine.filter((app) => app.status === "draft")
  const returned = ctx.mine.filter(isReturned)
  const offersOut = ctx.mine.filter((app) => app.status === "offer_sent")
  const expiringSoon = offersOut.filter((app) => isOfferExpiringSoon(ctx, app)).length
  const acceptedThisMonth = acceptedLoans(ctx)
    .filter((loan) => loan.app.officerId === ctx.session.user.id && loan.acceptedAt >= monthStart)
    .map((loan) => loan.app)

  return [
    figure("my_drafts", drafts.length, "Not yet submitted"),
    figure("returned_to_me", returned.length, returned.length > 0 ? "Fix and resubmit" : "Nothing to correct", {
      tone: returned.length > 0 ? "danger" : "neutral",
    }),
    figure(
      "offers_out",
      offersOut.length,
      expiringSoon > 0 ? `${pluralize(expiringSoon, "offer")} expire within 48h` : "None close to expiry",
      {
        tone: expiringSoon > 0 ? "warning" : "neutral",
      },
    ),
    figure("accepted_month", totalOf(acceptedThisMonth).value, pluralize(acceptedThisMonth.length, "loan")),
  ]
}

/** Verification officer: what to start, what's in progress, what's flagged. */
function verificationFigures(ctx: DashboardContext): DashboardFigure[] {
  const weekAgo = ctx.now.getTime() - 7 * DAY
  const toStart = withStatus(ctx, "submitted")
  const inVerification = withStatus(ctx, "in_verification")
  const flagged = inVerification.filter(hasFlaggedCheck).length
  const verifiedThisWeek = ctx.store.audit.filter(
    (event) =>
      event.actorId === ctx.session.user.id &&
      VERIFIED_ACTIONS.includes(event.action) &&
      Date.parse(event.at) >= weekAgo,
  ).length
  const oldest = oldestDays(ctx, toStart)

  return [
    figure("to_start", toStart.length, oldest === null ? "Queue is clear" : `Oldest waiting ${Math.floor(oldest)}d`),
    figure("in_verification", inVerification.length, "Checks in progress"),
    figure("checks_flagged", flagged, flagged > 0 ? "Failed or need review" : "No failed checks", {
      tone: flagged > 0 ? "danger" : "neutral",
    }),
    figure("verified_week", verifiedThisWeek, "Completed by you, last 7 days"),
  ]
}

/** Credit analyst: what to assess, how long it has waited, decisions at their stage. */
function assessmentFigures(ctx: DashboardContext): DashboardFigure[] {
  const weekAgo = ctx.now.getTime() - 7 * DAY
  const toAssess = withStatus(ctx, "in_assessment")
  const oldest = oldestDays(ctx, toAssess)
  const breached = ctx.decisions.filter((item) => item.sla?.state === "breached").length
  const assessedThisWeek = ctx.apps.filter(
    (app) => app.assessment?.updatedById === ctx.session.user.id && Date.parse(app.assessment.updatedAt) >= weekAgo,
  ).length

  return [
    figure("to_assess", toAssess.length, `${formatNaira(totalOf(toAssess).value, "compact")} requested`),
    figure("oldest_assessment", oldest, oldest === null ? "Nothing waiting" : "Longest in assessment", {
      tone: oldest !== null && oldest >= 3 ? "warning" : "neutral",
    }),
    figure("awaiting_decision", ctx.decisions.length, breached > 0 ? `${breached} past SLA` : "All within SLA", {
      tone: breached > 0 ? "danger" : "neutral",
    }),
    figure("assessed_week", assessedThisWeek, "Completed by you, last 7 days"),
  ]
}

/** Credit manager and final approver: their decisions and how much they can approve. */
function approvalFigures(ctx: DashboardContext): DashboardFigure[] {
  const breached = ctx.decisions.filter((item) => item.sla?.state === "breached").length
  const dueSoon = ctx.decisions.filter((item) => item.sla?.state === "due_soon").length
  const limit = approvalLimit(ctx)

  return [
    figure(
      "awaiting_decision",
      ctx.decisions.length,
      `${formatNaira(totalOf(ctx.decisions).value, "compact")} in total`,
    ),
    figure("past_sla", breached, breached > 0 ? "Oldest first in your queue" : "All within SLA", {
      tone: breached > 0 ? "danger" : "neutral",
    }),
    figure("due_soon", dueSoon, "Decide before they breach"),
    figure("approval_limit", limit, approvalLimitNote(limit)),
  ]
}

/**
 * The largest amount this user's approval stages can close, from the workflow's approval bands.
 * Null means there is no upper limit; 0 means their stages only recommend.
 */
function approvalLimit(ctx: DashboardContext): number | null {
  const { id, role } = ctx.session.user
  const limits: (number | null)[] = []
  for (const workflow of ctx.store.workflows) {
    for (const stage of workflow.stages) {
      const isApprover = stage.committee ? stage.committee.memberIds.includes(id) : stage.approverRoles.includes(role)
      if (isApprover) limits.push(authorityLimitForStage(workflow, stage.key))
    }
  }
  if (limits.includes(null)) return null
  return Math.max(0, ...(limits as number[]))
}

function approvalLimitNote(limit: number | null): string {
  if (limit === null) return "You can close any amount"
  if (limit > 0) return "Larger loans move up the chain"
  return "You recommend; a later stage closes"
}

/** Finance officer: accepted loans to hand over, and how quickly that happens. */
function financeFigures(ctx: DashboardContext): DashboardFigure[] {
  const now = ctx.now.getTime()
  const monthStart = startOfMonth(ctx.now).getTime()
  const waiting = withStatus(ctx, "offer_accepted")
  const handedOver = withStatus(ctx, "ready_for_disbursement")
  const handedOverThisMonth = handedOver.filter((app) => Date.parse(sinceOf(ctx, app)) >= monthStart)

  // Days from the customer accepting to finance taking it over, for handovers in the last 30 days.
  const handoverDays: number[] = []
  for (const app of handedOver) {
    const acceptedAt = acceptedOffer(app)?.respondedAt
    const handedOverAt = Date.parse(sinceOf(ctx, app))
    if (acceptedAt && handedOverAt >= now - 30 * DAY) {
      handoverDays.push((handedOverAt - Date.parse(acceptedAt)) / DAY)
    }
  }

  const oldest = oldestDays(ctx, waiting)
  return [
    figure("awaiting_handover", waiting.length, `${formatNaira(totalOf(waiting).value, "compact")} to hand over`),
    figure("oldest_handover", oldest, oldest === null ? "Nothing waiting" : "Since the customer accepted", {
      tone: oldest !== null && oldest > HANDOVER_LATE_DAYS ? "warning" : "neutral",
    }),
    figure("handed_over_month", totalOf(handedOverThisMonth).value, pluralize(handedOverThisMonth.length, "loan")),
    figure("handover_time", median(handoverDays), "Median, acceptance to handover, last 30 days"),
  ]
}

/** Head of Credit, auditor, admin: the whole book at a glance. */
function oversightFigures(ctx: DashboardContext): DashboardFigure[] {
  const pending = withStatus(ctx, "pending_approval")
  const breached = pending.filter((app) => listItem(ctx, app).sla?.state === "breached").length
  const pipeline = ctx.apps.filter((app) => !OUT_OF_PIPELINE.includes(app.status))
  const speed = turnaround(ctx)

  // Approval rate over applications submitted in the last 90 days that have an outcome.
  const ninetyDaysAgo = ctx.now.getTime() - 90 * DAY
  const recent = ctx.apps.filter((app) => app.submittedAt && Date.parse(app.submittedAt) >= ninetyDaysAgo)
  const approved = recent.filter((app) => APPROVED_STATUSES.includes(app.status)).length
  const rejected = recent.filter((app) => app.status === "rejected").length
  const decided = approved + rejected

  return [
    figure("pipeline", totalOf(pipeline).value, `${pluralize(pipeline.length, "application")} in progress`),
    figure("turnaround", speed.days, `${pluralize(speed.count, "loan")} accepted, last 30 days`, {
      previous: speed.previousDays,
    }),
    figure("past_sla", breached, `${pluralize(pending.length, "application")} awaiting approval`, {
      tone: breached > 0 ? "danger" : "neutral",
    }),
    figure(
      "approval_rate",
      decided > 0 ? approved / decided : null,
      `${approved} approved · ${rejected} declined, last 90 days`,
    ),
  ]
}
