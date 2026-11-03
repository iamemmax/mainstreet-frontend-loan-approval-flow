import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"

/**
 * Action PIN check. In mock mode every staff PIN is DEMO_PIN; a real
 * backend compares against a per-user hash and never returns the PIN.
 */
export const DEMO_PIN = "1234"
const MAX_ATTEMPTS = 3
const LOCK_MS = 15 * 60_000

export function verifyApprovalPin(store: MockStore, userId: string, pin: string, now = Date.now()) {
  const state = store.pinAttempts.get(userId) ?? { failures: 0, lockedUntil: null }
  if (state.lockedUntil && state.lockedUntil > now) {
    const minutes = Math.ceil((state.lockedUntil - now) / 60_000)
    throw new ApiError(
      423,
      "pin_locked",
      `Too many wrong PINs. Your PIN is locked for ${minutes} more minute${minutes === 1 ? "" : "s"}.`,
    )
  }
  if (pin !== (store.pins.get(userId) ?? DEMO_PIN)) {
    const failures = state.failures + 1
    const locked = failures >= MAX_ATTEMPTS
    store.pinAttempts.set(userId, { failures: locked ? 0 : failures, lockedUntil: locked ? now + LOCK_MS : null })
    throw new ApiError(
      locked ? 423 : 401,
      locked ? "pin_locked" : "invalid_pin",
      locked
        ? "Too many wrong PINs. Your PIN is locked for 15 minutes."
        : `Incorrect PIN. ${MAX_ATTEMPTS - failures} attempt${MAX_ATTEMPTS - failures === 1 ? "" : "s"} left.`,
    )
  }
  store.pinAttempts.delete(userId)
}
