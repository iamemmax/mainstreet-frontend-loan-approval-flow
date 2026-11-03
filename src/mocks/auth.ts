/** Mock sign-in: the current user id lives in localStorage. */
const KEY = "loan-origination.session.uid"

export function getMockUserId(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setMockUserId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(KEY, id)
    else window.localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable (private mode) — session lasts for this page only.
  }
}
