"use client"

import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { BUSINESS_SECTORS, findSector } from "../../schemas/business"
import { SelectField, TextField } from "./fields"
import type { FormValues } from "./schema"

const SECTOR_OPTIONS = BUSINESS_SECTORS.map((sector) => ({ value: sector.name, label: sector.name }))

/** The sector, then what the business trades, makes or does within it. Changing the sector clears the second. */
export function SectorFields() {
  const form = useFormContext<FormValues>()
  const sector = findSector(form.watch("sector"))
  const activities = sector?.activities.map((activity) => ({ value: activity, label: activity })) ?? []

  return (
    <>
      <SelectField
        name="sector"
        label="Sector"
        options={SECTOR_OPTIONS}
        onChange={() => form.setValue("activity", "")}
      />
      <SelectField
        name="activity"
        label={sector?.activityLabel ?? "What the business does"}
        options={activities}
        disabled={!sector}
      />
    </>
  )
}

/** What the business does and where it operates. Required for SME; a Retail customer may have no business. */
export function BusinessProfileFields({ segment }: { segment: FormValues["segment"] }) {
  const form = useFormContext<FormValues>()
  const optional = segment === "retail" ? " (optional)" : ""
  return (
    <>
      <FormField
        control={form.control}
        name="businessDescription"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Business description{optional}</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="e.g. Sells foodstuff wholesale to retailers in Mile 12 market"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField name="businessAddress" label={`Business address${optional}`} span />
    </>
  )
}
