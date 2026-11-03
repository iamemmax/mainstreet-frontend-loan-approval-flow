import type { Application, MessageInput } from "@/features/applications/types"
import type { Session } from "@/features/auth/types"
import type { NotificationKind } from "@/features/notifications/types"
import { assertTransition } from "@/features/workflow/engine"
import { DECISION_ACTION_LABELS, DECISION_REASONS, isValidReason } from "@/features/workflow/engine/reasons"
import type { DecisionInput } from "@/features/workflow/types"
import { ApiError } from "@/lib/api/errors"
import type { Permission } from "@/lib/rbac/permissions"
import type { MockStore } from "../store"
import { audit, requireOnDesk, requirePermission } from "./actions"
import { getApplication } from "./applications"
import { verifyApprovalPin } from "./pin"

/** Everyone who has worked on the application: they hear about new messages. */
function participants(app: Application): Set<string> {
  const ids = new Set<string>([app.officerId, app.createdById])
  app.workflow?.decisions.forEach((d) => d.actorId && ids.add(d.actorId))
  app.workflow?.stageVotes.forEach((v) => ids.add(v.userId))
  app.messages.forEach((m) => ids.add(m.authorId))
  if (app.assessment) ids.add(app.assessment.updatedById)
  app.offers.forEach((o) => ids.add(o.sentById))
  return ids
}

function notify(
  store: MockStore,
  userIds: Iterable<string>,
  kind: NotificationKind,
  app: Application,
  title: string,
  body: string,
) {
  const now = new Date().toISOString()
  for (const userId of userIds) {
    if (!store.users.some((u) => u.id === userId && u.status !== "inactive")) continue
    store.notifications.unshift({
      id: `ntf-${store.notifications.length + 1}-${userId}`,
      userId,
      kind,
      title,
      body,
      href: `/applications/${app.id}`,
      createdAt: now,
      readAt: null,
    })
  }
}

const preview = (text: string) => (text.length > 120 ? `${text.slice(0, 117)}…` : text)

/** Any staff member who can see the application can message the people working on it. */
export function postMessage(store: MockStore, session: Session, id: string, input: MessageInput) {
  const app = getApplication(store, session, id)
  const at = new Date().toISOString()
  app.messages.push({
    id: `${app.id}-msg-${app.messages.length + 1}`,
    authorId: session.user.id,
    body: input.body,
    at,
    kind: "message",
    reasonCode: null,
  })
  audit(store, session, app, "application.message", "Posted a message")
  const others = [...participants(app)].filter((u) => u !== session.user.id)
  notify(store, others, "message", app, `${session.user.name} on ${app.reference}`, preview(input.body))
  return app
}

/** Who may close or return an application before it reaches approval, by status. */
const REVIEW_PERMISSION: Partial<Record<Application["status"], Permission>> = {
  submitted: "verification:run",
  in_verification: "verification:run",
  in_assessment: "assessment:edit",
}

/**
 * Reject or return an application during verification or assessment. Both need a
 * reason and a comment, are confirmed with the PIN, and land in the discussion.
 */
export function reviewApplication(store: MockStore, session: Session, id: string, input: DecisionInput, pin: string) {
  const app = getApplication(store, session, id)
  const permission = REVIEW_PERMISSION[app.status]
  if (!permission)
    throw new ApiError(409, "not_reviewable", "Use the approval decision once the application is in approval")
  requirePermission(session, permission)
  requireOnDesk(store, session, app, new Date())
  if (input.action !== "reject" && input.action !== "return")
    throw new ApiError(422, "invalid_action", "Only reject or return is possible at this stage")
  if (!isValidReason(input.action, input.reasonCode))
    throw new ApiError(422, "invalid_reason", "Choose a reason from the list")
  verifyApprovalPin(store, session.user.id, pin)

  const to = input.action === "reject" ? "rejected" : "returned"
  assertTransition(app.status, to)
  const at = new Date().toISOString()
  app.status = to
  app.updatedAt = at
  app.messages.push({
    id: `${app.id}-msg-${app.messages.length + 1}`,
    authorId: session.user.id,
    body: input.comment,
    at,
    kind: input.action === "reject" ? "rejection" : "return",
    reasonCode: input.reasonCode,
  })
  const reason = DECISION_REASONS[input.action].find((r) => r.code === input.reasonCode)!.label
  audit(
    store,
    session,
    app,
    input.action === "reject" ? "application.rejected" : "application.returned",
    `${DECISION_ACTION_LABELS[input.action]}: ${reason}`,
    { reason: input.reasonCode, pinConfirmed: true },
  )
  if (app.officerId !== session.user.id) {
    notify(
      store,
      [app.officerId],
      input.action === "reject" ? "application_rejected" : "application_returned",
      app,
      `${app.reference} ${input.action === "reject" ? "rejected" : "returned for correction"}`,
      `${session.user.name}: ${preview(input.comment)}`,
    )
  }
  return app
}
