import { z } from "zod"
import { userSchema } from "@/features/auth/schemas/user"
import { delegationSchema } from "@/features/workflow/schemas/workflow"
import { mockRequest } from "@/mocks/transport"
import {
  cancelDelegation,
  changePassword,
  changePin,
  createDelegation,
  delegateCandidates,
  notificationPrefs,
  passwordStatus,
  saveNotificationPrefs,
} from "@/mocks/handlers/settings"
import {
  changePasswordInputSchema,
  changePinInputSchema,
  newDelegationInputSchema,
  notificationPrefsSchema,
} from "../schemas"
import type { ChangePasswordInput, ChangePinInput, NewDelegationInput, NotificationPrefs } from "../types"

export const settingsKeys = {
  notificationPrefs: ["settings", "notification-prefs"] as const,
  delegateCandidates: ["settings", "delegate-candidates"] as const,
  password: ["settings", "password"] as const,
}

const passwordStatusSchema = z.object({ changedAt: z.iso.datetime().nullable() })

// Real backend: apiFetch("/me/password", { schema: passwordStatusSchema })
export function fetchPasswordStatus() {
  return mockRequest(passwordStatusSchema, ({ store, session }) => passwordStatus(store, session))
}

// Real backend: apiFetch("/me/password", { method: "PUT", body: input, schema: passwordStatusSchema })
export function updatePassword(input: ChangePasswordInput) {
  const body = changePasswordInputSchema.parse(input)
  return mockRequest(passwordStatusSchema, ({ store, session }) => changePassword(store, session, body))
}

// Real backend: apiFetch("/me/pin", { method: "PUT", body: input })
export function updatePin(input: ChangePinInput) {
  const body = changePinInputSchema.parse(input)
  return mockRequest(z.null(), ({ store, session }) => changePin(store, session, body))
}

// Real backend: apiFetch("/me/notification-preferences", { schema: notificationPrefsSchema })
export function fetchNotificationPrefs() {
  return mockRequest(notificationPrefsSchema, ({ store, session }) => notificationPrefs(store, session))
}

// Real backend: apiFetch("/me/notification-preferences", { method: "PUT", body: prefs, schema: notificationPrefsSchema })
export function updateNotificationPrefs(prefs: NotificationPrefs) {
  const body = notificationPrefsSchema.parse(prefs)
  return mockRequest(notificationPrefsSchema, ({ store, session }) => saveNotificationPrefs(store, session, body))
}

// Real backend: apiFetch("/me/delegates", { schema: z.array(userSchema) })
export function fetchDelegateCandidates() {
  return mockRequest(z.array(userSchema), ({ store, session }) => delegateCandidates(store, session), {
    permission: "approval:delegate",
  })
}

// Real backend: apiFetch("/me/delegations", { method: "POST", body: { ...input, pin }, schema: delegationSchema })
export function addDelegation(input: NewDelegationInput, pin: string) {
  const body = newDelegationInputSchema.parse(input)
  return mockRequest(delegationSchema, ({ store, session }) => createDelegation(store, session, body, pin), {
    permission: "approval:delegate",
  })
}

// Real backend: apiFetch(`/me/delegations/${id}`, { method: "DELETE" })
export function removeDelegation(id: string) {
  return mockRequest(z.null(), ({ store, session }) => cancelDelegation(store, session, id), {
    permission: "approval:delegate",
  })
}
