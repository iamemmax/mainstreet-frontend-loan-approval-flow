import type { Session } from "@/features/auth/types"
import type { DashboardSummary } from "@/features/dashboard/schemas/dashboard"
import { ROLE_PROFILE } from "@/lib/rbac/profiles"
import type { MockStore } from "../../store"
import { buildAlerts } from "./alerts"
import { buildCharts } from "./charts"
import { createContext } from "./context"
import { buildFigures } from "./figures"
import { buildInsights } from "./insights"
import { buildQueue } from "./queue"

export { monthlyVolume } from "./insights"

/**
 * GET /dashboard/summary. Each role gets its own dashboard (see ROLE_PROFILE):
 * four figures, what is waiting on them, alerts they can act on, and charts:
 * where loans are waiting for managers, or the team's own two charts for everyone else.
 */
export function dashboardSummary(store: MockStore, session: Session, now = new Date()): DashboardSummary {
  const ctx = createContext(store, session, now)
  const profile = ROLE_PROFILE[session.user.role]

  return {
    generatedAt: now.toISOString(),
    focus: profile.dashboard,
    figures: buildFigures(ctx, profile.dashboard),
    queue: buildQueue(ctx),
    alerts: buildAlerts(ctx),
    insights: profile.insights ? buildInsights(ctx) : null,
    charts: profile.insights ? null : buildCharts(ctx, profile.dashboard),
  }
}
