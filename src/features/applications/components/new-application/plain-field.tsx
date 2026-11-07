"use client"

import { useId } from "react"
import { NumberInput } from "@/components/shared/number-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface PlainFieldProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  className?: string
  /** Digits only, shown with thousands separators as typed. For amounts. */
  grouped?: boolean
}

/** A labelled input for the parts of the form kept outside react-hook-form: guarantors, collateral, documents. */
export function PlainField({ label, value, onChange, error, className, grouped, ...input }: PlainFieldProps) {
  const id = useId()
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {grouped ? (
        <NumberInput id={id} value={value} onValueChange={onChange} aria-invalid={!!error} {...input} />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          {...input}
          className={cn(input.readOnly && "bg-muted/50 text-muted-foreground")}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface PlainSelectProps {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  error?: string
  className?: string
}

/** A labelled dropdown to match `PlainField`, for picking one of a fixed list. */
export function PlainSelect({ label, value, options, onChange, error, className }: PlainSelectProps) {
  const id = useId()
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
