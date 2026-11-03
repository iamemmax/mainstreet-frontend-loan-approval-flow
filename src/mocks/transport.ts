import type { z } from "zod"
import type { Session } from "@/features/auth/types"
import { WorkflowEngineError } from "@/features/workflow/engine"
import { ApiError } from "@/lib/api/errors"
import type { Permission } from "@/lib/rbac/permissions"
import { getMockUserId } from "./auth"
import { getStore, type MockStore } from "./store"

const LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 300)

function wait() {
  return LATENCY_MS > 0 ? new Promise((r) => setTimeout(r, LATENCY_MS * (0.5 + Math.random()))) : Promise.resolve()
}

export function sessionFrom(store: MockStore): Session | null {
  const uid = getMockUserId()
  const user = store.users.find((u) => u.id === uid && u.status !== "inactive")
  return user ? { user, permissions: store.rolePermissions[user.role] } : null
}

export interface MockContext {
  store: MockStore
  session: Session
}

interface MockRequestOptions {
  /** Requires a signed-in user (default true). */
  auth?: boolean
  permission?: Permission
}

/**
 * Stands in for an HTTP round trip: latency, auth, permission check, a deep
 * copy (so callers can never mutate the store) and Zod validation of the
 * response — the same contract `apiFetch` enforces against the real API.
 */
export async function mockRequest<S extends z.ZodType>(
  schema: S,
  produce: (ctx: MockContext) => unknown,
  { auth = true, permission }: MockRequestOptions = {},
): Promise<z.output<S>> {
  const [store] = await Promise.all([getStore(), wait()])
  const session = sessionFrom(store)
  if (auth && !session) throw new ApiError(401, "unauthenticated", "Sign in to continue")
  if (permission && !session?.permissions.includes(permission)) {
    throw new ApiError(403, "forbidden", "You do not have permission to do this")
  }
  try {
    const result = produce({ store, session: session as Session })
    return schema.parse(structuredClone(result))
  } catch (e) {
    if (e instanceof WorkflowEngineError) {
      throw new ApiError(e.code === "not_allowed" ? 403 : 409, e.code, e.message)
    }
    throw e
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}
