import type { Application, ApplicationListItem, ApplicationStatus } from "@/features/applications/types"
import { RETURNED_STATUSES } from "@/features/applications/schemas/status"
import { currentOffer } from "@/features/applications/utils/offer"
import type { Session } from "@/features/auth/types"
import type { QueueItem } from "@/features/dashboard/schemas/dashboard"
import type { MockStore } from "../../store"
import { myWork } from "../actions"
import { toListItem, visibleApplications } from "../applications"
import { auditIndex, DAY, enteredAt } from "../timeline"

/** An offer this close to expiry is worth a call to the customer. */
export const OFFER_CHASE_DAYS = 2
/** Accepted loans waiting longer than this are late for handover. */
export const HANDOVER_LATE_DAYS = 2

/** Everything the dashboard needs, worked out once per request. */
export interface DashboardContext {
  store: MockStore
  session: Session
  now: Date
  /** Applications this user is allowed to see. */
  apps: Application[]
  /** Applications where this user is the relationship officer. */
  mine: Application[]
  /** Approval decisions waiting on this user (or someone they cover for). */
  decisions: QueueItem[]
  /** When each application reached the step it is on now. */
  since: Map<string, string>
  listItems: Map<string, ApplicationListItem>
}

export function createContext(store: MockStore, session: Session, now: Date): DashboardContext {
  const apps = visibleApplications(store, session)
  const latest = auditIndex(store)

  const since = new Map<string, string>()
  for (const app of apps) {
    since.set(app.id, enteredAt(app, latest))
  }

  const ctx: DashboardContext = {
    store,
    session,
    now,
    apps,
    mine: apps.filter((app) => app.officerId === session.user.id),
    decisions: [],
    since,
    listItems: new Map(),
  }
  ctx.decisions = approvalDecisions(ctx)
  return ctx
}

/** Approvals the workflow engine says this user can decide right now. */
function approvalDecisions(ctx: DashboardContext): QueueItem[] {
  if (!ctx.session.permissions.includes("approval:act")) return []

  const work = myWork(ctx.store, ctx.session)
  return [...work.pending, ...work.delegated].map((item) => ({
    ...item,
    action: "decide",
    since: ctx.since.get(item.id) ?? item.updatedAt,
  }))
}

export function withStatus(ctx: DashboardContext, ...statuses: ApplicationStatus[]): Application[] {
  return ctx.apps.filter((app) => statuses.includes(app.status))
}

export function sinceOf(ctx: DashboardContext, app: Application): string {
  return ctx.since.get(app.id) ?? app.updatedAt
}

/** How many days the application has been at its current step. */
export function daysAtStep(ctx: DashboardContext, app: Application): number {
  return (ctx.now.getTime() - Date.parse(sinceOf(ctx, app))) / DAY
}

/** The longest any of these applications has been at its step, or null when there are none. */
export function oldestDays(ctx: DashboardContext, apps: Application[]): number | null {
  if (apps.length === 0) return null
  return Math.max(...apps.map((app) => daysAtStep(ctx, app)))
}

/** The row shape used in lists (applicant name, SLA and so on), built once per application. */
export function listItem(ctx: DashboardContext, app: Application): ApplicationListItem {
  let item = ctx.listItems.get(app.id)
  if (!item) {
    item = toListItem(ctx.store, app, ctx.now)
    ctx.listItems.set(app.id, item)
  }
  return item
}

export function applicantNames(ctx: DashboardContext, apps: Application[]): string[] {
  return apps.map((app) => listItem(ctx, app).applicantName)
}

export function isReturned(app: Application): boolean {
  return RETURNED_STATUSES.includes(app.status)
}

/** A check failed or needs review. */
export function hasFlaggedCheck(app: Application): boolean {
  return app.verification.some((check) => check.status !== "passed")
}

export function isOfferExpiringSoon(ctx: DashboardContext, app: Application): boolean {
  const offer = currentOffer(app)
  if (app.status !== "offer_sent" || !offer) return false
  return Date.parse(offer.expiresAt) - ctx.now.getTime() < OFFER_CHASE_DAYS * DAY
}

/** Number of applications and their total requested amount. */
export function totalOf(apps: { amountRequested: number }[]) {
  let value = 0
  for (const app of apps) value += app.amountRequested
  return { count: apps.length, value }
}
