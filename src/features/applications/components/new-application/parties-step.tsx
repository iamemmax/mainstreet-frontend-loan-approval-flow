"use client"

import { CircleCheck, Plus, Trash2, Upload } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { NumberInput } from "@/components/shared/number-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatNaira, koboToNaira, nairaToKobo } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { DOCUMENT_TYPE_LABELS, REQUIRED_DOCUMENTS } from "../../schemas/application"
import type { ApplicationDocument, Collateral, Guarantor, NextOfKin } from "../../types"
import { FormCard } from "./fields"

export type DocumentDraft = Pick<ApplicationDocument, "type" | "fileName" | "sizeBytes">

export const emptyGuarantor = (): Guarantor => ({
  name: "",
  relationship: "",
  phone: "",
  address: "",
  occupation: "",
  monthlyIncome: null,
  bvn: null,
})
export const emptyNextOfKin = (): NextOfKin => ({ name: "", relationship: "", phone: "", address: "" })
const emptyCollateral = (): Collateral => ({ type: "", description: "", estimatedValue: 0, forcedSaleValue: null })

const PHONE = /^(\+234|0)[789]\d{9}$/

/** Field-level problems with the parties step, keyed like "guarantors.0.phone". */
export function partiesErrors(
  guarantors: Guarantor[],
  nextOfKin: NextOfKin,
  collateral: Collateral[],
  segment: "retail" | "sme",
) {
  const errors: Record<string, string> = {}
  if (!guarantors.length) errors["guarantors"] = "Add at least one guarantor"
  guarantors.forEach((g, i) => {
    if (g.name.trim().length < 3) errors[`guarantors.${i}.name`] = "Enter the guarantor's full name"
    if (g.relationship.trim().length < 2) errors[`guarantors.${i}.relationship`] = "Enter the relationship"
    if (!PHONE.test(g.phone)) errors[`guarantors.${i}.phone`] = "Enter a Nigerian mobile number"
    if (g.address.trim().length < 5) errors[`guarantors.${i}.address`] = "Enter the address"
    if (g.occupation.trim().length < 2) errors[`guarantors.${i}.occupation`] = "Enter the occupation"
    if (g.bvn && !/^\d{11}$/.test(g.bvn)) errors[`guarantors.${i}.bvn`] = "BVN must be 11 digits"
  })
  if (nextOfKin.name.trim().length < 3) errors["nextOfKin.name"] = "Enter the next of kin's full name"
  if (nextOfKin.relationship.trim().length < 2) errors["nextOfKin.relationship"] = "Enter the relationship"
  if (!PHONE.test(nextOfKin.phone)) errors["nextOfKin.phone"] = "Enter a Nigerian mobile number"
  if (nextOfKin.address.trim().length < 5) errors["nextOfKin.address"] = "Enter the address"
  if (segment === "sme") {
    collateral.forEach((c, i) => {
      if (c.type.trim().length < 2) errors[`collateral.${i}.type`] = "Enter the collateral type"
      if (c.description.trim().length < 3) errors[`collateral.${i}.description`] = "Describe the collateral"
      if (c.estimatedValue <= 0) errors[`collateral.${i}.estimatedValue`] = "Enter the estimated value"
    })
  }
  return errors
}

interface PartiesStepProps {
  segment: "retail" | "sme"
  guarantors: Guarantor[]
  onGuarantors: (g: Guarantor[]) => void
  nextOfKin: NextOfKin
  onNextOfKin: (n: NextOfKin) => void
  collateral: Collateral[]
  onCollateral: (c: Collateral[]) => void
  errors: Record<string, string>
  showErrors: boolean
}

export function PartiesStep({
  segment,
  guarantors,
  onGuarantors,
  nextOfKin,
  onNextOfKin,
  collateral,
  onCollateral,
  errors,
  showErrors,
}: PartiesStepProps) {
  const err = (key: string) => (showErrors ? errors[key] : undefined)
  const setG = (i: number, patch: Partial<Guarantor>) =>
    onGuarantors(guarantors.map((g, j) => (j === i ? { ...g, ...patch } : g)))
  const setC = (i: number, patch: Partial<Collateral>) =>
    onCollateral(collateral.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  return (
    <div className="space-y-6">
      <FormCard
        title="Guarantors"
        description={
          segment === "sme" ? "Two guarantors are recommended for SME loans." : "At least one guarantor is required."
        }
        bodyClassName="space-y-4"
      >
        {guarantors.map((g, i) => (
          <fieldset key={i} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">Guarantor {i + 1}</legend>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove guarantor ${i + 1}`}
                onClick={() => onGuarantors(guarantors.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                value={g.name}
                onChange={(v) => setG(i, { name: v })}
                error={err(`guarantors.${i}.name`)}
              />
              <Field
                label="Relationship to applicant"
                value={g.relationship}
                onChange={(v) => setG(i, { relationship: v })}
                error={err(`guarantors.${i}.relationship`)}
              />
              <Field
                label="Phone"
                type="tel"
                value={g.phone}
                onChange={(v) => setG(i, { phone: v })}
                error={err(`guarantors.${i}.phone`)}
              />
              <Field
                label="Occupation"
                value={g.occupation}
                onChange={(v) => setG(i, { occupation: v })}
                error={err(`guarantors.${i}.occupation`)}
              />
              <Field
                label="Monthly income (₦, optional)"
                grouped
                value={g.monthlyIncome === null ? "" : String(koboToNaira(g.monthlyIncome))}
                onChange={(v) => setG(i, { monthlyIncome: v ? nairaToKobo(Number(v)) : null })}
              />
              <Field
                label="BVN (optional)"
                inputMode="numeric"
                maxLength={11}
                value={g.bvn ?? ""}
                onChange={(v) => setG(i, { bvn: v.replace(/\D/g, "") || null })}
                error={err(`guarantors.${i}.bvn`)}
              />
              <Field
                label="Address"
                className="sm:col-span-2"
                value={g.address}
                onChange={(v) => setG(i, { address: v })}
                error={err(`guarantors.${i}.address`)}
              />
            </div>
          </fieldset>
        ))}
        {err("guarantors") && <p className="text-sm text-destructive">{err("guarantors")}</p>}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => onGuarantors([...guarantors, emptyGuarantor()])}
        >
          <Plus aria-hidden /> Add guarantor
        </Button>
      </FormCard>

      <FormCard title="Next of kin" bodyClassName="grid gap-5 sm:grid-cols-2">
        <Field
          label="Full name"
          value={nextOfKin.name}
          onChange={(v) => onNextOfKin({ ...nextOfKin, name: v })}
          error={err("nextOfKin.name")}
        />
        <Field
          label="Relationship"
          value={nextOfKin.relationship}
          onChange={(v) => onNextOfKin({ ...nextOfKin, relationship: v })}
          error={err("nextOfKin.relationship")}
        />
        <Field
          label="Phone"
          type="tel"
          value={nextOfKin.phone}
          onChange={(v) => onNextOfKin({ ...nextOfKin, phone: v })}
          error={err("nextOfKin.phone")}
        />
        <Field
          label="Address"
          value={nextOfKin.address}
          onChange={(v) => onNextOfKin({ ...nextOfKin, address: v })}
          error={err("nextOfKin.address")}
        />
      </FormCard>

      {segment === "sme" && (
        <FormCard
          title="Collateral"
          description="Assets pledged against the loan, with estimated and forced-sale values."
          bodyClassName="space-y-4"
        >
          {collateral.map((c, i) => (
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
              <Field
                label="Type"
                placeholder="e.g. Vehicle, Property"
                value={c.type}
                onChange={(v) => setC(i, { type: v })}
                error={err(`collateral.${i}.type`)}
              />
              <Field
                label="Description"
                value={c.description}
                onChange={(v) => setC(i, { description: v })}
                error={err(`collateral.${i}.description`)}
              />
              <Field
                label="Estimated value (₦)"
                grouped
                value={c.estimatedValue ? String(koboToNaira(c.estimatedValue)) : ""}
                onChange={(v) => setC(i, { estimatedValue: nairaToKobo(Number(v || 0)) })}
                error={err(`collateral.${i}.estimatedValue`)}
              />
              <Field
                label="Forced-sale value (₦, optional)"
                grouped
                value={c.forcedSaleValue === null ? "" : String(koboToNaira(c.forcedSaleValue))}
                onChange={(v) => setC(i, { forcedSaleValue: v ? nairaToKobo(Number(v)) : null })}
              />
            </fieldset>
          ))}
          {collateral.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Total estimated value:{" "}
              <span className="tabular font-medium text-foreground">
                {formatNaira(collateral.reduce((t, c) => t + c.estimatedValue, 0))}
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
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  error,
  className,
  grouped,
  ...input
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  className?: string
  grouped?: boolean
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const id = useId()
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {grouped ? (
        <NumberInput id={id} value={value} onValueChange={onChange} aria-invalid={!!error} {...input} />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...input} />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png"
const MAX_BYTES = 10 * 1_048_576

/** One upload slot per required document type, plus optional extras. */
export function DocumentsChecklist({
  segment,
  documents,
  onChange,
}: {
  segment: "retail" | "sme"
  documents: DocumentDraft[]
  onChange: (d: DocumentDraft[]) => void
}) {
  const required = REQUIRED_DOCUMENTS[segment]
  const extras = (["utility_bill", "collateral", "other"] as const).filter((t) => !required.includes(t))
  return (
    <FormCard
      title="Documents"
      description="PDF, JPG or PNG up to 10 MB. Missing documents can be added later while the application is a draft."
    >
      <ul className="divide-y rounded-lg border">
        {[...required, ...extras].map((type) => (
          <DocumentSlot
            key={type}
            label={DOCUMENT_TYPE_LABELS[type]}
            required={required.includes(type)}
            doc={documents.find((d) => d.type === type)}
            onFile={(file) =>
              onChange([
                ...documents.filter((d) => d.type !== type),
                { type, fileName: file.name, sizeBytes: file.size },
              ])
            }
            onRemove={() => onChange(documents.filter((d) => d.type !== type))}
          />
        ))}
      </ul>
    </FormCard>
  )
}

function DocumentSlot({
  label,
  required,
  doc,
  onFile,
  onRemove,
}: {
  label: string
  required: boolean
  doc?: DocumentDraft
  onFile: (f: File) => void
  onRemove: () => void
}) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md border",
          doc ? "border-success/30 bg-success/10 text-success" : "bg-muted/50 text-muted-foreground",
        )}
      >
        {doc ? <CircleCheck className="size-4" aria-hidden /> : <Upload className="size-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">
          {label}{" "}
          {required ? (
            <span className="text-xs font-normal text-muted-foreground">· required</span>
          ) : (
            <span className="text-xs font-normal text-muted-foreground">· optional</span>
          )}
        </div>
        <div className={cn("truncate text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? (doc ? `${doc.fileName} · ${Math.max(1, Math.round(doc.sizeBytes / 1024))} KB` : "Not uploaded")}
        </div>
      </div>
      {doc ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      ) : (
        <Label
          htmlFor={id}
          className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm font-medium hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          Upload
          <input
            id={id}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (!f) return
              if (f.size > MAX_BYTES) return setError("Files must be 10 MB or smaller")
              if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return setError("Upload a PDF, JPG or PNG")
              setError(null)
              onFile(f)
            }}
          />
        </Label>
      )}
    </li>
  )
}
