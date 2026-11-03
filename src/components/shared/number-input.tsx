"use client"

import { type ComponentProps, type Ref, useLayoutEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { groupDigits } from "@/lib/format/money"
import { cn } from "@/lib/utils"

interface NumberInputProps extends Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  /** Whole-number digits, e.g. "1500000". Empty string for blank. */
  value: string
  onValueChange: (digits: string) => void
}

/**
 * A whole-number input that shows thousands separators while you type
 * ("1,500,000") and hands back plain digits. The caret stays after the same
 * digit when a comma appears or disappears. Not for identifiers such as BVN,
 * NIN or phone numbers, which are never grouped.
 */
export function NumberInput({ value, onValueChange, className, ref, ...props }: NumberInputProps) {
  const own = useRef<HTMLInputElement | null>(null)
  // Digits to the left of the caret at the last keystroke.
  const caret = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = own.current
    if (!el || caret.current === null || document.activeElement !== el) return
    let pos = 0
    for (let seen = 0; pos < el.value.length && seen < caret.current; pos++) if (/\d/.test(el.value[pos])) seen++
    el.setSelectionRange(pos, pos)
    caret.current = null
  })

  const setRef = (el: HTMLInputElement | null) => {
    own.current = el
    if (typeof ref === "function") ref(el)
    else if (ref) (ref as { current: HTMLInputElement | null }).current = el
  }

  return (
    <Input
      {...props}
      ref={setRef as Ref<HTMLInputElement>}
      inputMode="numeric"
      autoComplete="off"
      className={cn("tabular", className)}
      value={groupDigits(value)}
      onChange={(e) => {
        const raw = e.target.value
        const digits = raw.replace(/\D/g, "")
        const trimmed = digits.replace(/^0+(?=\d)/, "")
        const before = raw.slice(0, e.target.selectionStart ?? raw.length).replace(/\D/g, "").length
        caret.current = Math.max(0, before - (digits.length - trimmed.length))
        onValueChange(trimmed)
      }}
    />
  )
}
