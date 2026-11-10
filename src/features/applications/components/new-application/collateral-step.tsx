"use client"

import { Plus, Trash2 } from "lucide-react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format/money"
import { COLLATERAL_TYPES } from "../../schemas/business"
import { CollateralFilesField } from "./collateral-files-field"
import { FormCard, MoneyField, SelectField, TextField } from "./fields"
import { emptyCollateral } from "./list-schemas"
import { OwnerFields } from "./owner-fields"
import type { FormValues } from "./schema"
import { borrowerName } from "./to-input"

const TYPE_OPTIONS = COLLATERAL_TYPES.map((type) => ({ value: type, label: type }))

/** Step 5: assets pledged against the loan, each with a type, its owner, values, and photos or documents. */
export function CollateralStep() {
  const form = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "collateral" })
  const segment = form.watch("segment")
  const collateral = form.watch("collateral")
  const borrower = borrowerName(form.getValues())

  return (
    <FormCard
      title="Collateral"
      description={
        segment === "sme"
          ? "Assets pledged against the loan. SME loans are usually secured."
          : "Assets pledged against the loan, if any. Leave this empty for an unsecured loan."
      }
      bodyClassName="space-y-4"
    >
      {fields.map((field, i) => (
        <fieldset key={field.id} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2">
            <legend className="text-sm font-medium">Item {i + 1}</legend>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove collateral ${i + 1}`}
              onClick={() => remove(i)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <SelectField name={`collateral.${i}.type`} label="Type" options={TYPE_OPTIONS} />
          <Controller
            control={form.control}
            name={`collateral.${i}.owner`}
            render={({ field: owner, fieldState }) => (
              <OwnerFields
                label="Owner"
                owner={owner.value}
                borrowerName={borrower}
                onChange={owner.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <TextField
            name={`collateral.${i}.description`}
            label="Description"
            placeholder="e.g. Toyota Hilux 2019, registered to the business"
            span
          />
          <MoneyField name={`collateral.${i}.estimatedValue`} label="Estimated value (₦)" />
          <MoneyField name={`collateral.${i}.forcedSaleValue`} label="Forced-sale value (₦, optional)" optional />
          <Controller
            control={form.control}
            name={`collateral.${i}.files`}
            render={({ field: files, fieldState }) => (
              <CollateralFilesField
                className="sm:col-span-2"
                item={collateral[i]}
                name={borrower}
                onChange={files.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </fieldset>
      ))}
      {collateral.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Total estimated value:{" "}
          <span className="tabular font-medium text-foreground">
            {formatNaira(collateral.reduce((total, item) => total + item.estimatedValue, 0))}
          </span>
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => append(emptyCollateral())}
      >
        <Plus aria-hidden /> Add collateral
      </Button>
    </FormCard>
  )
}
