"use client"

import { useId } from "react"
import { NumberInput } from "@/components/shared/number-input"
import { Label } from "@/components/ui/label"

/** A naira amount input that shows thousands separators while you type. Holds whole naira as digits. */
export function NairaField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (digits: string) => void
  disabled?: boolean
  hint?: string
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">
          ₦
        </span>
        <NumberInput id={id} disabled={disabled} className="pl-8 font-medium" value={value} onValueChange={onChange} />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
