"use client"

import type { ReactNode } from "react"
import { useFormContext } from "react-hook-form"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { FormCard } from "@/components/shared/form-card"
import { NumberInput } from "@/components/shared/number-input"
import { type Field, type FormValues } from "./schema"

export { FORM_HEADER, FormCard } from "@/components/shared/form-card"

/** A step's fields on a two-column grid. Use `span` for anything that should take a full row. */
export function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <FormCard title={title} description={description} bodyClassName="grid content-start gap-x-5 gap-y-5 sm:grid-cols-2">
      {children}
    </FormCard>
  )
}

/** Phone, email and address. A person's address is their home; a business's is where it's registered. */
export function ContactFields({ segment }: { segment: FormValues["segment"] }) {
  return (
    <>
      <TextField name="phone" label="Phone" type="tel" autoComplete="tel" placeholder="0803 000 0000" />
      <TextField name="email" label="Email" type="email" autoComplete="email" />
      <TextField name="state" label="State" />
      <TextField
        name="address"
        label={segment === "retail" ? "Home address" : "Registered address"}
        autoComplete="street-address"
        span
      />
    </>
  )
}

interface TextFieldProps extends Omit<React.ComponentProps<typeof Input>, "name"> {
  name: Field
  label: string
  /** Strips everything but digits as the user types. For identifiers such as BVN, NIN and phone. */
  numeric?: boolean
  /** Digits only, shown with thousands separators as typed. For amounts and counts. */
  grouped?: boolean
  /** Take the full row of the two-column grid. */
  span?: boolean
}

export function TextField({ name, label, numeric, grouped, span, ...input }: TextFieldProps) {
  const { control } = useFormContext<FormValues>()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(span && "sm:col-span-2")}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {grouped ? (
              <NumberInput
                {...input}
                {...field}
                value={String(field.value ?? "")}
                onValueChange={field.onChange}
                className={cn(input.readOnly && "bg-muted/50 text-muted-foreground")}
              />
            ) : (
              <Input
                {...input}
                {...field}
                value={field.value ?? ""}
                className={cn(numeric && "tabular", input.readOnly && "bg-muted/50 text-muted-foreground")}
                onChange={(e) => field.onChange(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function SelectField({
  name,
  label,
  options,
  description,
  span,
  disabled,
  onChange,
}: {
  name: Field
  label: string
  options: { value: string; label: string }[]
  description?: ReactNode
  span?: boolean
  disabled?: boolean
  /** Runs after the value is set, e.g. to clear a field that depends on this one. */
  onChange?: (value: string) => void
}) {
  const { control } = useFormContext<FormValues>()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(span && "sm:col-span-2")}>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value ?? ""}
            onValueChange={(value) => {
              field.onChange(value)
              onChange?.(value)
            }}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
