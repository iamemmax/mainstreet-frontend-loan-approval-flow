"use client"

import { useCallback, useState } from "react"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { PIN_LENGTH } from "./pin-pad"

/** PIN state and submit handling: clears the PIN on a wrong guess, locks after too many. */
export function usePinEntry(run: (pin: string) => Promise<unknown>, onDone: () => void) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = useCallback(() => {
    setPin("")
    setError(null)
  }, [])

  const submit = async (value = pin) => {
    if (value.length !== PIN_LENGTH || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await run(value)
      onDone()
    } catch (e) {
      setPin("")
      if (isApiError(e) && e.code === "invalid_pin") setError(errorMessage(e))
      // Anything else (locked PIN, permission, stale status) is explained by the error modal.
      else onDone()
    } finally {
      setSubmitting(false)
    }
  }

  const change = (value: string) => {
    setPin(value)
    if (error) setError(null)
  }

  return { pin, error, submitting, ready: pin.length === PIN_LENGTH, change, submit, reset, setError }
}
