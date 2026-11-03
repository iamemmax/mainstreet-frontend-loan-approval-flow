import { OPEN_STATUSES } from "@/features/applications/schemas/status"
import type { Application } from "@/features/applications/types"
import type { DashboardSummary } from "@/features/dashboard/schemas/dashboard"
import { type DashboardFocus, ROLE_PROFILE } from "@/lib/rbac/profiles"
import {
  applicantNames,
  daysAtStep,
  type DashboardContext,
  HANDOVER_LATE_DAYS,
  hasFlaggedCheck,
  isOfferExpiringSoon,
  isReturned,
  listItem,
  withStatus,
} from "./context"

type Alert = DashboardSummary["alerts"][number]

/**
 * What needs attention, most urgent first. Each team only gets alerts it can act on:
 * finance never sees approval SLAs, verification never sees offers.
 */
export function buildAlerts(ctx: DashboardContext): Alert[] {
  const focus = ROLE_PROFILE[ctx.session.user.role].dashboard
  const alerts: Alert[] = []

  function add(key: Alert["key"], names: string[]) {
    if (names.length > 0) {
      alerts.push({ key, count: names.length, examples: names.slice(0, 2) })
    }
  }

  // Approvals past or close to SLA: the user's own decisions, or all of them for oversight.
  const pending =
    focus === "oversight" ? withStatus(ctx, "pending_approval").map((app) => listItem(ctx, app)) : ctx.decisions
  const breached = pending
    .filter((item) => item.sla?.state === "breached")
    .sort((a, b) => a.sla!.dueAt.localeCompare(b.sla!.dueAt))
  add(
    "sla_breached",
    breached.map((item) => item.applicantName),
  )
  add(
    "sla_due_soon",
    pending.filter((item) => item.sla?.state === "due_soon").map((item) => item.applicantName),
  )

  if (focus === "verification") {
    add("checks_failed", applicantNames(ctx, withStatus(ctx, "in_verification").filter(hasFlaggedCheck)))
  }

  if (focus === "origination") {
    add("returned", applicantNames(ctx, ctx.mine.filter(isReturned)))
  }
  if (focus === "oversight") {
    add("returned", applicantNames(ctx, ctx.apps.filter(isReturned)))
  }

  const flagged = flaggedScope(ctx, focus).filter((app) => app.flags.some((flag) => flag !== "auto_escalated"))
  add("flagged", applicantNames(ctx, flagged))

  if (focus === "origination") {
    add(
      "offers_expiring",
      applicantNames(
        ctx,
        ctx.mine.filter((app) => isOfferExpiringSoon(ctx, app)),
      ),
    )
  }
  if (focus === "approval" || focus === "oversight") {
    add(
      "offers_expiring",
      applicantNames(
        ctx,
        ctx.apps.filter((app) => isOfferExpiringSoon(ctx, app)),
      ),
    )
  }

  if (focus === "finance" || focus === "oversight") {
    const late = withStatus(ctx, "offer_accepted").filter((app) => daysAtStep(ctx, app) > HANDOVER_LATE_DAYS)
    add("awaiting_handover", applicantNames(ctx, late))
  }

  return alerts
}

/** The applications whose flags (duplicate, PEP, failed BVN) this team should hear about. */
function flaggedScope(ctx: DashboardContext, focus: DashboardFocus): Application[] {
  switch (focus) {
    case "origination":
      return ctx.mine.filter((app) => OPEN_STATUSES.includes(app.status))
    case "verification":
      return withStatus(ctx, "submitted", "in_verification")
    case "assessment":
      return withStatus(ctx, "in_assessment")
    case "approval":
      return ctx.decisions.map((item) => ctx.apps.find((app) => app.id === item.id)!)
    case "finance":
      return []
    case "oversight":
      return ctx.apps.filter((app) => OPEN_STATUSES.includes(app.status))
  }
}
