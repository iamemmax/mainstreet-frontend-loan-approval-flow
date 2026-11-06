import { z } from "zod"
import { setMockUserId } from "@/mocks/auth"
import { mockRequest, sessionFrom } from "@/mocks/transport"
import { ApiError } from "@/lib/api/errors"
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
}

/** Signs in with the account's password. The PIN is asked for later, on each action that needs it. */
// Real backend: apiFetch("/auth/sign-in", { method: "POST", body: input, schema: sessionSchema })
export function signIn({ userId, password }: SignInInput) {
  return mockRequest(
    sessionSchema,
    ({ store }) => {
      const user = store.users.find((u) => u.id === userId && u.status !== "inactive")
      if (!user) throw new ApiError(404, "not_found", "Unknown user")
      verifyPassword(store, user.id, password)
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
