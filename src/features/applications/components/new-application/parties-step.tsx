"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format/date"
import { koboToNaira, nairaToKobo } from "@/lib/format/money"
import { GUARANTOR_LIMITS, RELATIONSHIPS } from "../../schemas/business"
import type { BvnRecord, Guarantor, NextOfKin } from "../../types"
import { BvnLookupField } from "./bvn-lookup-field"
import { FormCard } from "./fields"
import { PlainField, PlainSelect } from "./plain-field"

export const emptyGuarantor = (): Guarantor => ({
  name: "",
  relationship: "",
  phone: "",
  address: "",
  occupation: "",
  monthlyIncome: null,
  bvn: null,
  dateOfBirth: null,
  gender: null,
})

export const emptyNextOfKin = (): NextOfKin => ({
  name: "",
  relationship: "",
  phone: "",
  address: "",
  bvn: null,
  dateOfBirth: null,
  gender: null,
})

const PHONE = /^(\+234|0)[789]\d{9}$/

/** The register's details for a guarantor or next of kin. Phone and address can still be changed. */
function fromRecord(record: BvnRecord) {
  return {
    bvn: record.bvn,
    name: [record.firstName, record.middleName, record.lastName].filter(Boolean).join(" "),
    dateOfBirth: record.dateOfBirth,
    gender: record.gender,
    phone: record.phone,
    address: record.address,
  }
}

/** Problems shared by guarantors and next of kin, keyed like "guarantors.0.phone". */
function personErrors(person: Guarantor | NextOfKin, key: string, errors: Record<string, string>) {
  if (!person.bvn || !person.dateOfBirth) errors[`${key}.bvn`] = "Enter a BVN to look the person up"
  if (!person.relationship) errors[`${key}.relationship`] = "Choose the relationship"
  if (!PHONE.test(person.phone)) errors[`${key}.phone`] = "Enter a Nigerian mobile number"
  if (person.address.trim().length < 5) errors[`${key}.address`] = "Enter the address"
}

/** Field-level problems with the guarantors step, keyed like "guarantors.0.phone". */
export function partiesErrors(guarantors: Guarantor[], nextOfKin: NextOfKin) {
  const errors: Record<string, string> = {}
  if (guarantors.length < GUARANTOR_LIMITS.min) errors["guarantors"] = `Add at least ${GUARANTOR_LIMITS.min} guarantors`
  guarantors.forEach((guarantor, i) => {
    personErrors(guarantor, `guarantors.${i}`, errors)
    if (guarantor.occupation.trim().length < 2) errors[`guarantors.${i}.occupation`] = "Enter the occupation"
    const usedBefore = guarantors.slice(0, i).some((other) => other.bvn && other.bvn === guarantor.bvn)
    if (usedBefore) errors[`guarantors.${i}.bvn`] = "This person is already a guarantor"
  })
  personErrors(nextOfKin, "nextOfKin", errors)
  return errors
}

interface PartiesStepProps {
  guarantors: Guarantor[]
  onGuarantors: (g: Guarantor[]) => void
  nextOfKin: NextOfKin
  onNextOfKin: (n: NextOfKin) => void
  errors: Record<string, string>
  showErrors: boolean
}

/** Step 4: two to four guarantors and one next of kin, each found by BVN. */
export function PartiesStep({
  guarantors,
  onGuarantors,
  nextOfKin,
  onNextOfKin,
  errors,
  showErrors,
}: PartiesStepProps) {
  const err = (key: string) => (showErrors ? errors[key] : undefined)
  const setGuarantor = (i: number, patch: Partial<Guarantor>) =>
    onGuarantors(guarantors.map((g, j) => (j === i ? { ...g, ...patch } : g)))
  const canAdd = guarantors.length < GUARANTOR_LIMITS.max
  const canRemove = guarantors.length > GUARANTOR_LIMITS.min

  return (
    <div className="space-y-6">
      <FormCard
        title="Guarantors"
        description={`Between ${GUARANTOR_LIMITS.min} and ${GUARANTOR_LIMITS.max} guarantors. Enter each one's BVN and their details fill in.`}
        bodyClassName="space-y-4"
      >
        {guarantors.map((guarantor, i) => (
          <fieldset key={i} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">Guarantor {i + 1}</legend>
              {canRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove guarantor ${i + 1}`}
                  onClick={() => onGuarantors(guarantors.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <BvnLookupField
                bvn={guarantor.bvn}
                found={!!guarantor.dateOfBirth}
                // A new BVN clears the last person's details until the lookup answers.
                onBvnChange={(bvn) => setGuarantor(i, { bvn, name: "", dateOfBirth: null, gender: null })}
                onFound={(record) => setGuarantor(i, fromRecord(record))}
                error={err(`guarantors.${i}.bvn`)}
              />
              <RegisteredDetails person={guarantor} />
              <PlainSelect
                label="Relationship to applicant"
                options={RELATIONSHIPS}
                value={guarantor.relationship}
                onChange={(v) => setGuarantor(i, { relationship: v })}
                error={err(`guarantors.${i}.relationship`)}
              />
              <PlainField
                label="Phone"
                type="tel"
                value={guarantor.phone}
                onChange={(v) => setGuarantor(i, { phone: v })}
                error={err(`guarantors.${i}.phone`)}
              />
              <PlainField
                label="Occupation"
                value={guarantor.occupation}
                onChange={(v) => setGuarantor(i, { occupation: v })}
                error={err(`guarantors.${i}.occupation`)}
              />
              <PlainField
                label="Monthly income (₦, optional)"
                grouped
                value={guarantor.monthlyIncome === null ? "" : String(koboToNaira(guarantor.monthlyIncome))}
                onChange={(v) => setGuarantor(i, { monthlyIncome: v ? nairaToKobo(Number(v)) : null })}
              />
              <PlainField
                label="Address"
                className="sm:col-span-2"
                value={guarantor.address}
                onChange={(v) => setGuarantor(i, { address: v })}
                error={err(`guarantors.${i}.address`)}
              />
            </div>
          </fieldset>
        ))}
        {err("guarantors") && <p className="text-sm text-destructive">{err("guarantors")}</p>}
        {canAdd && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={() => onGuarantors([...guarantors, emptyGuarantor()])}
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
        <BvnLookupField
          bvn={nextOfKin.bvn}
          found={!!nextOfKin.dateOfBirth}
          onBvnChange={(bvn) => onNextOfKin({ ...nextOfKin, bvn, name: "", dateOfBirth: null, gender: null })}
          onFound={(record) => onNextOfKin({ ...nextOfKin, ...fromRecord(record) })}
          error={err("nextOfKin.bvn")}
        />
        <RegisteredDetails person={nextOfKin} />
        <PlainSelect
          label="Relationship"
          options={RELATIONSHIPS}
          value={nextOfKin.relationship}
          onChange={(v) => onNextOfKin({ ...nextOfKin, relationship: v })}
          error={err("nextOfKin.relationship")}
        />
        <PlainField
          label="Phone"
          type="tel"
          value={nextOfKin.phone}
          onChange={(v) => onNextOfKin({ ...nextOfKin, phone: v })}
          error={err("nextOfKin.phone")}
        />
        <PlainField
          label="Address"
          className="sm:col-span-2"
          value={nextOfKin.address}
          onChange={(v) => onNextOfKin({ ...nextOfKin, address: v })}
          error={err("nextOfKin.address")}
        />
      </FormCard>
    </div>
  )
}

/** Name, date of birth and gender as the BVN register holds them; read-only. */
function RegisteredDetails({ person }: { person: Guarantor | NextOfKin }) {
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

function genderLabel(gender: Guarantor["gender"]): string {
  if (gender === "female") return "Female"
  if (gender === "male") return "Male"
  return ""
}
