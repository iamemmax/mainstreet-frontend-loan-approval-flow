"use client"

import { useSyncExternalStore } from "react"
import { PinConfirmDialog, type PinRequest } from "./pin-confirm-dialog"

// One PIN request at a time, rendered by <PinConfirmHost /> in the providers,
// so a screen can never forget to mount its dialog.
let current: PinRequest | null = null
const listeners = new Set<() => void>()
const set = (next: PinRequest | null) => {
  current = next
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Ask for the user's PIN before an action runs: `usePinConfirm().confirm({ title, confirmLabel, run })`. */
export function usePinConfirm() {
  return { confirm: set }
}

export function PinConfirmHost() {
  const request = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
  return <PinConfirmDialog request={request} onClose={() => set(null)} />
}
