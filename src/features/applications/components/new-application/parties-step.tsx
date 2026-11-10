"use client"

import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format/date"
import { GUARANTOR_LIMITS, RELATIONSHIPS } from "../../schemas/business"
import type { BvnRecord } from "../../types"
import { BvnLookupField } from "./bvn-lookup-field"
import { FormCard, MoneyField, SelectField, TextField } from "./fields"
import { emptyGuarantor, type GuarantorValues } from "./list-schemas"
import { PlainField } from "./plain-field"
import type { FormValues } from "./schema"

const RELATIONSHIP_OPTIONS = RELATIONSHIPS.map((relationship) => ({ value: relationship, label: relationship }))

/** The register's details for a guarantor or next of kin. Phone and address can still be changed. */
function fromRecord(record: BvnRecord): Partial<GuarantorValues> {
  return {
    bvn: record.bvn,
    name: [record.firstName, record.middleName, record.lastName].filter(Boolean).join(" "),
    dateOfBirth: record.dateOfBirth,
    gender: record.gender,
    phone: record.phone,
    address: record.address,
  }
}

/** Step 4: two to four guarantors and one next of kin, each found by BVN. */
export function PartiesStep() {
  const form = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "guarantors" })
  const errors = form.formState.errors.guarantors
  const listError = errors?.message ?? errors?.root?.message

  return (
    <div className="space-y-6">
      <FormCard
        title="Guarantors"
        description={`Between ${GUARANTOR_LIMITS.min} and ${GUARANTOR_LIMITS.max} guarantors. Enter each one's BVN and their details fill in.`}
        bodyClassName="space-y-4"
      >
        {fields.map((field, i) => (
          <fieldset key={field.id} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">Guarantor {i + 1}</legend>
              {fields.length > GUARANTOR_LIMITS.min && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove guarantor ${i + 1}`}
                  onClick={() => remove(i)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <PersonLookup path={`guarantors.${i}`} />
              <SelectField
                name={`guarantors.${i}.relationship`}
                label="Relationship to applicant"
                options={RELATIONSHIP_OPTIONS}
              />
              <TextField name={`guarantors.${i}.phone`} label="Phone" type="tel" />
              <TextField name={`guarantors.${i}.occupation`} label="Occupation" />
              <MoneyField name={`guarantors.${i}.monthlyIncome`} label="Monthly income (₦, optional)" optional />
              <TextField name={`guarantors.${i}.address`} label="Address" span />
            </div>
          </fieldset>
        ))}
        {listError && <p className="text-sm text-destructive">{listError}</p>}
        {fields.length < GUARANTOR_LIMITS.max && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={() => append(emptyGuarantor())}
          >
            <Plus aria-hidden /> Add guarantor
          </Button>
        )}
      </FormCard>

      <FormCard
        title="Next of kin"
        description="One person to contact about the applicant. Enter their BVN and their details fill in."
        bodyClassName="grid gap-5 sm:grid-cols-2"
      >
        <PersonLookup path="nextOfKin" />
        <SelectField name="nextOfKin.relationship" label="Relationship" options={RELATIONSHIP_OPTIONS} />
        <TextField name="nextOfKin.phone" label="Phone" type="tel" />
        <TextField name="nextOfKin.address" label="Address" span />
      </FormCard>
    </div>
  )
}

/**
 * A guarantor's or the next of kin's BVN, then the name, date of birth and gender the register holds for it.
 * `path` is where the person sits on the form, e.g. "guarantors.0".
 */
function PersonLookup({ path }: { path: `guarantors.${number}` | "nextOfKin" }) {
  const form = useFormContext<FormValues>()
  const person = form.watch(path)
  const error = form.getFieldState(`${path}.bvn`, form.formState).error?.message

  /** Sets several of this person's fields at once; `validate` re-checks them, e.g. once the lookup answers. */
  const set = (values: Partial<GuarantorValues>, validate: boolean) => {
    for (const [key, value] of Object.entries(values)) {
      form.setValue(`${path}.${key as "name"}`, value as string, { shouldValidate: validate })
    }
  }

  return (
    <>
      <BvnLookupField
        bvn={person.bvn}
        found={!!person.dateOfBirth}
        // A new BVN clears the last person's details until the lookup answers.
        onBvnChange={(bvn) => set({ bvn, name: "", dateOfBirth: null, gender: null }, false)}
        onFound={(record) => set(fromRecord(record), true)}
        error={error}
      />
      <RegisteredDetails person={person} />
    </>
  )
}

/** Name, date of birth and gender as the BVN register holds them; read-only. */
function RegisteredDetails({ person }: { person: Pick<GuarantorValues, "name" | "dateOfBirth" | "gender"> }) {
  const details = [
    { label: "Full name", value: person.name },
    { label: "Date of birth", value: person.dateOfBirth ? formatDate(person.dateOfBirth, "d MMM yyyy") : "" },
    { label: "Gender", value: genderLabel(person.gender) },
  ]
  return (
    <>
      {details.map((detail) => (
        <PlainField key={detail.label} label={detail.label} value={detail.value} onChange={() => {}} readOnly />
      ))}
    </>
  )
}

function genderLabel(gender: GuarantorValues["gender"]): string {
  if (gender === "female") return "Female"
  if (gender === "male") return "Male"
  return ""
}
