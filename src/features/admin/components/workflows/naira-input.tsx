"use client"

import { NumberInput } from "@/components/shared/number-input"
import { koboToNaira, nairaToKobo } from "@/lib/format/money"

/** Edits a kobo amount in whole naira. Empty means null (no limit). */
export function NairaInput({
  value,
  onChange,
  placeholder,
  ...aria
}: {
  value: number | null
  onChange: (kobo: number | null) => void
  placeholder?: string
  "aria-label": string
}) {
  return (
    <NumberInput
      className="h-8 min-w-28"
      placeholder={placeholder}
      value={value === null ? "" : String(koboToNaira(value))}
      onValueChange={(digits) => onChange(digits ? nairaToKobo(Number(digits)) : null)}
      {...aria}
    />
  )
}
