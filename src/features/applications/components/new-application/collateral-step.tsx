"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatNaira, koboToNaira, nairaToKobo } from "@/lib/format/money"
import { COLLATERAL_TYPES } from "../../schemas/business"
import type { Collateral } from "../../types"
import { CollateralFilesField } from "./collateral-files-field"
import { FormCard } from "./fields"
import { OwnerFields, ownerProblem } from "./owner-fields"
import { PlainField, PlainSelect } from "./plain-field"

const emptyCollateral = (): Collateral => ({
  type: "",
  description: "",
  estimatedValue: 0,
  forcedSaleValue: null,
  files: [],
  owner: null,
})

/** Field-level problems with the collateral step, keyed like "collateral.0.type". Collateral itself is optional. */
export function collateralErrors(collateral: Collateral[]) {
  const errors: Record<string, string> = {}
  collateral.forEach((item, i) => {
    if (!item.type) errors[`collateral.${i}.type`] = "Choose the collateral type"
    if (item.description.trim().length < 3) errors[`collateral.${i}.description`] = "Describe the collateral"
    if (item.estimatedValue <= 0) errors[`collateral.${i}.estimatedValue`] = "Enter the estimated value"
    const owner = ownerProblem(item.owner)
    if (owner) errors[`collateral.${i}.owner`] = owner
    if (!item.files.length) errors[`collateral.${i}.files`] = "Add at least one photo or document"
  })
  return errors
}

interface CollateralStepProps {
  segment: "retail" | "sme"
  collateral: Collateral[]
  onCollateral: (c: Collateral[]) => void
  /** The borrower's name, for the "the borrower owns it" choice. */
  borrowerName: string
  errors: Record<string, string>
  showErrors: boolean
}

/** Step 5: assets pledged against the loan, each with a type, its owner, values, and photos or documents. */
export function CollateralStep({
  segment,
  collateral,
  onCollateral,
  borrowerName,
  errors,
  showErrors,
}: CollateralStepProps) {
  const err = (key: string) => (showErrors ? errors[key] : undefined)
  const setItem = (i: number, patch: Partial<Collateral>) =>
    onCollateral(collateral.map((item, j) => (j === i ? { ...item, ...patch } : item)))

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
      {collateral.map((item, i) => (
        <fieldset key={i} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2">
            <legend className="text-sm font-medium">Item {i + 1}</legend>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove collateral ${i + 1}`}
              onClick={() => onCollateral(collateral.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <PlainSelect
            label="Type"
            options={COLLATERAL_TYPES}
            value={item.type}
            onChange={(type) => setItem(i, { type })}
            error={err(`collateral.${i}.type`)}
          />
          <OwnerFields
            label="Owner"
            owner={item.owner}
            borrowerName={borrowerName}
            onChange={(owner) => setItem(i, { owner })}
            error={err(`collateral.${i}.owner`)}
          />
          <PlainField
            label="Description"
            className="sm:col-span-2"
            placeholder="e.g. Toyota Hilux 2019, registered to the business"
            value={item.description}
            onChange={(v) => setItem(i, { description: v })}
            error={err(`collateral.${i}.description`)}
          />
          <PlainField
            label="Estimated value (₦)"
            grouped
            value={item.estimatedValue ? String(koboToNaira(item.estimatedValue)) : ""}
            onChange={(v) => setItem(i, { estimatedValue: nairaToKobo(Number(v || 0)) })}
            error={err(`collateral.${i}.estimatedValue`)}
          />
          <PlainField
            label="Forced-sale value (₦, optional)"
            grouped
            value={item.forcedSaleValue === null ? "" : String(koboToNaira(item.forcedSaleValue))}
            onChange={(v) => setItem(i, { forcedSaleValue: v ? nairaToKobo(Number(v)) : null })}
          />
          <CollateralFilesField
            className="sm:col-span-2"
            item={item}
            name={borrowerName}
            onChange={(files) => setItem(i, { files })}
            error={err(`collateral.${i}.files`)}
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
        onClick={() => onCollateral([...collateral, emptyCollateral()])}
      >
        <Plus aria-hidden /> Add collateral
      </Button>
    </FormCard>
  )
}
