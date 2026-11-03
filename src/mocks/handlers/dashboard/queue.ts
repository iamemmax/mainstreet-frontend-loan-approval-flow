import type { Application } from "@/features/applications/types"
import { requiredChecks } from "@/features/applications/utils/checks"
import type { DashboardSummary, QueueAction, QueueItem } from "@/features/dashboard/schemas/dashboard"
import { ROLE_PROFILE } from "@/lib/rbac/profiles"
import { type DashboardContext, isOfferExpiringSoon, isReturned, listItem, sinceOf } from "./context"

/** How many items the "Waiting on you" card shows. */
const QUEUE_SIZE = 6

const SLA_ORDER = { breached: 0, due_soon: 1, on_track: 2 }

/** What is waiting on this user, most urgent first. Null for roles that never hold work. */
export function buildQueue(ctx: DashboardContext): DashboardSummary["queue"] {
  const { role } = ctx.session.user
  const canDecide = ctx.session.permissions.includes("approval:act")
  if (ROLE_PROFILE[role].dashboard === "oversight" && !canDecide) return null

  const items: QueueItem[] = [...ctx.decisions]
  for (const app of ctx.apps) {
    const action = nextActionFor(ctx, app)
    if (action) {
      items.push({ ...listItem(ctx, app), action, since: sinceOf(ctx, app), onBehalfOfName: null })
    }
  }

  items.sort(mostUrgentFirst)
  return { total: items.length, items: items.slice(0, QUEUE_SIZE) }
}

/** Past SLA first, then due soon, then whatever has waited longest. */
function mostUrgentFirst(a: QueueItem, b: QueueItem): number {
  const slaDifference = SLA_ORDER[a.sla?.state ?? "on_track"] - SLA_ORDER[b.sla?.state ?? "on_track"]
  if (slaDifference !== 0) return slaDifference
  return a.since.localeCompare(b.since)
}

/**
 * The step this application is waiting on the user for, if any.
 * Approval decisions are not here: they come from the workflow engine (ctx.decisions).
 */
function nextActionFor(ctx: DashboardContext, app: Application): QueueAction | null {
  const { id, role } = ctx.session.user
  const can = (permission: (typeof ctx.session.permissions)[number]) => ctx.session.permissions.includes(permission)

  // The relationship officer's own applications.
  if (app.officerId === id) {
    if (app.status === "draft" && can("application:edit")) return "finish_draft"
    if (isReturned(app) && can("application:edit")) return "fix_return"
    if (app.status === "approved" && can("offer:send")) return "send_offer"
    if (isOfferExpiringSoon(ctx, app) && can("offer:send")) return "chase_offer"
  }

  if (role === "verification_officer" && can("verification:run")) {
    if (app.status === "submitted") return "start_verification"
    if (app.status === "in_verification") {
      return allChecksRun(app) ? "complete_verification" : "run_checks"
    }
  }

  if (role === "credit_analyst" && app.status === "in_assessment" && can("assessment:edit")) {
    return "assess"
  }

  if (role === "finance_officer" && app.status === "offer_accepted" && can("handover:view")) {
    return "hand_over"
  }

  return null
}

function allChecksRun(app: Application): boolean {
  const done = new Set(app.verification.map((check) => check.kind))
  return requiredChecks(app).every((kind) => done.has(kind))
}
