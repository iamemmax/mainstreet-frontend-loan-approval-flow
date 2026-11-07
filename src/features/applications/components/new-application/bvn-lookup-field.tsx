"use client"

import { CircleAlert, CircleCheck, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { isApiError } from "@/lib/api/errors"
import { useFetchBvnRecord } from "../../hooks/use-applications"
import type { BvnRecord } from "../../types"
import { PlainField } from "./plain-field"

type LookupState = "idle" | "looking" | "not_found" | "failed"

interface BvnLookupFieldProps {
  bvn: string | null
  /** The person's details are already filled in from the register, e.g. on a saved draft. */
  found: boolean
  onBvnChange: (bvn: string | null) => void
  onFound: (record: BvnRecord) => void
  error?: string
}

/** A BVN input that looks the person up as the 11th digit is typed and hands back their register record. */
export function BvnLookupField({ bvn, found, onBvnChange, onFound, error }: BvnLookupFieldProps) {
  const fetchRecord = useFetchBvnRecord()
  const [state, setState] = useState<LookupState>("idle")
  // The latest BVN typed, so a slow answer for an older one is ignored.
  const latest = useRef(bvn ?? "")

  const lookUp = async (typed: string) => {
    setState("looking")
    try {
      const record = await fetchRecord(typed)
      if (latest.current !== typed) return
      setState("idle")
      onFound(record)
    } catch (lookupError) {
      if (latest.current !== typed) return
      setState(isApiError(lookupError) && lookupError.status === 404 ? "not_found" : "failed")
    }
  }

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <PlainField
        label="BVN"
        inputMode="numeric"
        maxLength={11}
        value={bvn ?? ""}
        error={state === "idle" ? error : undefined}
        onChange={(value) => {
          const typed = value.replace(/\D/g, "")
          latest.current = typed
          onBvnChange(typed || null)
          if (typed.length === 11) void lookUp(typed)
          else setState("idle")
        }}
      />
      <LookupStatus state={state} found={found} onRetry={() => bvn && void lookUp(bvn)} />
    </div>
  )
}

function LookupStatus({ state, found, onRetry }: { state: LookupState; found: boolean; onRetry: () => void }) {
  if (state === "looking") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Looking up the BVN…
      </p>
    )
  }
  if (state === "not_found") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive">
        <CircleAlert className="size-3.5" aria-hidden /> No BVN record found. Check the number with the person.
      </p>
    )
  }
  if (state === "failed") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive">
        <CircleAlert className="size-3.5" aria-hidden /> Couldn&apos;t look up the BVN.
        <button type="button" onClick={onRetry} className="font-medium underline">
          Try again
        </button>
      </p>
    )
  }
  if (found) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-success">
        <CircleCheck className="size-3.5" aria-hidden /> Name, date of birth and gender are from the BVN record.
      </p>
    )
  }
  return <p className="text-xs text-muted-foreground">Their details fill in from the BVN record.</p>
}
