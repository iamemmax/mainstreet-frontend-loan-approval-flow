import { useSyncExternalStore } from "react"

/** One error at a time, shown by <ErrorModalHost />. Callable from anywhere, including the query client. */
let current: unknown = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function showError(error: unknown) {
  current = error
  emit()
}

export function dismissError() {
  current = null
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCurrentError() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
