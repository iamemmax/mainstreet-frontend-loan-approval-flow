import { DEFAULT_NOTIFICATION_PREFS, MAX_DELEGATION_DAYS, PERSONAL_EVENTS } from "@/features/settings/constants"
import type {
  ChangePasswordInput,
  ChangePinInput,
  NewDelegationInput,
  NotificationPrefs,
} from "@/features/settings/types"
import type { Session } from "@/features/auth/types"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"
import { verifyApprovalPin } from "./pin"

const DAY = 86_400_000

/** Every demo account starts with this password. */
export const DEMO_PASSWORD = "Mainstreet@2026"

function auditUser(
  store: MockStore,
  session: Session,
  action: string,
  summary: string,
  metadata: Record<string, string | boolean | null> = {},
) {
  store.audit.unshift({
    id: `aud-${store.audit.length + 1}`,
    at: new Date().toISOString(),
    actorId: session.user.id,
    actorName: session.user.name,
    action,
    entity: "user",
    entityId: session.user.id,
    entityLabel: session.user.name,
    summary,
    metadata,
  })
}

/** The current PIN proves it's really them; wrong guesses count towards the lockout. */
export function changePin(store: MockStore, session: Session, input: ChangePinInput) {
  verifyApprovalPin(store, session.user.id, input.currentPin)
  store.pins.set(session.user.id, input.newPin)
  auditUser(store, session, "user.pin_changed", "Changed their PIN")
  return null
}

export function passwordStatus(store: MockStore, session: Session) {
  return { changedAt: store.passwords.get(session.user.id)?.changedAt ?? null }
}

/** Checks a user's sign-in password. A real backend compares a salted hash. */
export function verifyPassword(
  store: MockStore,
  userId: string,
  password: string,
  message = "That password is incorrect",
) {
  const current = store.passwords.get(userId)?.value ?? DEMO_PASSWORD
  if (password !== current) throw new ApiError(401, "invalid_password", message)
}

/** Needs the current password. The new one may not contain the user's name or email. */
export function changePassword(store: MockStore, session: Session, input: ChangePasswordInput) {
  verifyPassword(store, session.user.id, input.currentPassword, "Your current password is incorrect")
  const lower = input.newPassword.toLowerCase()
  const personal = [
    ...session.user.name.toLowerCase().split(" "),
    session.user.email.split("@")[0].toLowerCase(),
  ].filter((w) => w.length >= 3)
  if (personal.some((w) => lower.includes(w)))
    throw new ApiError(422, "personal_password", "Don't use your name or email in your password")
  const changedAt = new Date().toISOString()
  store.passwords.set(session.user.id, { value: input.newPassword, changedAt })
  auditUser(store, session, "user.password_changed", "Changed their password")
  return { changedAt }
}

export function notificationPrefs(store: MockStore, session: Session): NotificationPrefs {
  return store.notificationPrefs.get(session.user.id) ?? DEFAULT_NOTIFICATION_PREFS
}

export function saveNotificationPrefs(store: MockStore, session: Session, prefs: NotificationPrefs) {
  for (const e of PERSONAL_EVENTS.flatMap((g) => g.events)) {
    if (e.required && !prefs[e.kind]?.includes("inApp"))
      throw new ApiError(422, "required_event", `In-app alerts for "${e.label}" can't be switched off`)
  }
  store.notificationPrefs.set(session.user.id, prefs)
  auditUser(store, session, "user.notifications_updated", "Updated notification preferences")
  return prefs
}

/** Colleagues who can cover: same role, active, not me. */
export function delegateCandidates(store: MockStore, session: Session) {
  return store.users.filter((u) => u.role === session.user.role && u.id !== session.user.id && u.status === "active")
}

/** Hand my approvals to a colleague for a period. Signed with the PIN, since it grants approval authority. */
export function createDelegation(store: MockStore, session: Session, input: NewDelegationInput, pin: string) {
  if (!session.permissions.includes("approval:delegate"))
    throw new ApiError(403, "forbidden", "Your role can't delegate approvals")
  const to = delegateCandidates(store, session).find((u) => u.id === input.toUserId)
  if (!to) throw new ApiError(422, "invalid_delegate", "Choose an active colleague in the same role")
  const startsAt = new Date(`${input.startsAt}T00:00:00`)
  const endsAt = new Date(`${input.endsAt}T23:59:59`)
  const today = new Date(new Date().toDateString())
  if (endsAt.getTime() < today.getTime()) throw new ApiError(422, "in_past", "The delegation must end today or later")
  if ((endsAt.getTime() - startsAt.getTime()) / DAY > MAX_DELEGATION_DAYS) {
    throw new ApiError(422, "too_long", `A delegation can run for at most ${MAX_DELEGATION_DAYS} days`)
  }
  const overlap = store.delegations.find(
    (d) => d.fromUserId === session.user.id && new Date(d.startsAt) <= endsAt && startsAt <= new Date(d.endsAt),
  )
  if (overlap) throw new ApiError(409, "overlap", "You already have a delegation in those dates. Cancel it first.")
  verifyApprovalPin(store, session.user.id, pin)

  const delegation = {
    id: `dlg-${store.delegations.length + 1}-${Date.now()}`,
    fromUserId: session.user.id,
    toUserId: to.id,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    reason: input.reason,
  }
  store.delegations.push(delegation)
  store.notifications.unshift({
    id: `ntf-${store.notifications.length + 1}-${to.id}`,
    userId: to.id,
    kind: "delegation",
    title: `${session.user.name} delegated their approvals to you`,
    body: `${input.startsAt} to ${input.endsAt} · ${input.reason}`,
    href: "/my-work",
    createdAt: new Date().toISOString(),
    readAt: null,
  })
  auditUser(store, session, "user.delegation_created", `Delegated approvals to ${to.name}`, {
    to: to.id,
    pinConfirmed: true,
  })
  return delegation
}

export function cancelDelegation(store: MockStore, session: Session, id: string) {
  const index = store.delegations.findIndex((d) => d.id === id && d.fromUserId === session.user.id)
  if (index < 0) throw new ApiError(404, "not_found", "Delegation not found")
  const [removed] = store.delegations.splice(index, 1)
  auditUser(store, session, "user.delegation_cancelled", "Cancelled a delegation", { to: removed.toUserId })
  return null
}
