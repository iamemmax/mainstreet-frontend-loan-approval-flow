"use client"

import { CircleAlert } from "lucide-react"
import { PinInput } from "../pin-input"

export const PIN_LENGTH = 4

interface PinPadProps {
  pin: string
  onPinChange: (pin: string) => void
  onComplete: (pin: string) => void
  error: string | null
  submitting: boolean
  label?: string
}

/** The PIN entry shared by decisions and every other confirmed action. */
export function PinPad({ pin, onPinChange, onComplete, error, submitting, label = "Your PIN" }: PinPadProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{PIN_LENGTH} digits</span>
      </div>
      <PinInput
        value={pin}
        onChange={onPinChange}
        onComplete={onComplete}
        length={PIN_LENGTH}
        invalid={!!error}
        disabled={submitting}
        autoFocus
        aria-label={label}
      />
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Forgot it? Ask your system administrator to reset your PIN.</p>
      )}
    </div>
  )
}
