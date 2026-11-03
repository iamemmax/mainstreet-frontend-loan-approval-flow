import { z } from "zod"
import { setMockUserId } from "@/mocks/auth"
import { mockRequest, sessionFrom } from "@/mocks/transport"
import { ApiError } from "@/lib/api/errors"
import { verifyApprovalPin } from "@/mocks/handlers/pin"
import { verifyPassword } from "@/mocks/handlers/settings"
import { sessionSchema, userSchema } from "../schemas/user"

export const authKeys = {
  session: ["auth", "session"] as const,
  demoUsers: ["auth", "demo-users"] as const,
}

export function fetchSession() {
  return mockRequest(sessionSchema.nullable(), ({ store }) => sessionFrom(store), { auth: false })
}

export interface SignInInput {
  userId: string
  password: string
  pin: string
}

/** Checks the account's password; the PIN step comes after. Nothing is signed in yet. */
// Real backend: apiFetch("/auth/password", { method: "POST", body: { userId, password } })
export function checkPassword({ userId, password }: Omit<SignInInput, "pin">) {
  return mockRequest(
    z.null(),
    ({ store }) => {
      if (!store.users.some((u) => u.id === userId && u.status !== "inactive"))
        throw new ApiError(404, "not_found", "Unknown user")
      verifyPassword(store, userId, password)
      return null
    },
    { auth: false },
  )
}

/** Signs in only with both factors: the password, then the PIN (wrong PINs count towards the lockout). */
// Real backend: apiFetch("/auth/sign-in", { method: "POST", body: input, schema: sessionSchema })
export function signIn({ userId, password, pin }: SignInInput) {
  return mockRequest(
    sessionSchema,
    ({ store }) => {
      const user = store.users.find((u) => u.id === userId && u.status !== "inactive")
      if (!user) throw new ApiError(404, "not_found", "Unknown user")
      verifyPassword(store, user.id, password)
      verifyApprovalPin(store, user.id, pin)
      setMockUserId(user.id)
      return sessionFrom(store)
    },
    { auth: false },
  )
}

export function signOut() {
  return mockRequest(
    z.null(),
    () => {
      setMockUserId(null)
      return null
    },
    { auth: false },
  )
}

/** Every active staff user, for the staff sign-in page. */
export function fetchDemoUsers() {
  return mockRequest(z.array(userSchema), ({ store }) => store.users.filter((u) => u.status !== "inactive"), {
    auth: false,
  })
}
