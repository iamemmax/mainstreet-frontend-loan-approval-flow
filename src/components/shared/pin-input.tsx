"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  /** Called when the last digit is entered. */
  onComplete?: (value: string) => void
  length?: number
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  "aria-label"?: string
}

/** Masked, one-box-per-digit PIN entry with auto-advance, backspace and paste. */
export function PinInput({
  value,
  onChange,
  onComplete,
  length = 4,
  invalid,
  disabled,
  autoFocus,
  ...aria
}: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? "")

  const set = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }

  return (
    <div
      role="group"
      aria-label={aria["aria-label"] ?? "PIN"}
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid}
          value={d}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "").slice(-1)
            if (!typed) return
            const clean = set(value.slice(0, i) + typed + value.slice(i + 1))
            refs.current[Math.min(clean.length, length - 1)]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault()
              const at = d ? i : Math.max(0, i - 1)
              set(value.slice(0, at))
              refs.current[at]?.focus()
            } else if (e.key === "ArrowLeft") refs.current[i - 1]?.focus()
            else if (e.key === "ArrowRight") refs.current[i + 1]?.focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            const clean = set(e.clipboardData.getData("text"))
            refs.current[Math.min(clean.length, length - 1)]?.focus()
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-full rounded-xl border bg-background text-center text-2xl font-semibold shadow-xs transition-colors outline-none",
            "focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50",
            invalid && "border-destructive focus:border-destructive focus:ring-destructive/15",
          )}
        />
      ))}
    </div>
  )
}
