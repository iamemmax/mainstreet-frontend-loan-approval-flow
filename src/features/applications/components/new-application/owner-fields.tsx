"use client"

import type { Owner } from "../../types"
import { PlainField, PlainSelect } from "./plain-field"

const BORROWER = "The borrower"
const SOMEONE_ELSE = "Someone else"

interface OwnerFieldsProps {
  label: string
  owner: Owner | null
  /** The borrower's name, saved when "The borrower" is picked. */
  borrowerName: string
  onChange: (owner: Owner) => void
  error?: string
}

/** Who something belongs to: the borrower, or someone else whose name the officer types in. */
export function OwnerFields({ label, owner, borrowerName, onChange, error }: OwnerFieldsProps) {
  const choice = ownerChoice(owner)
  return (
    <>
      <PlainSelect
        label={label}
        options={[BORROWER, SOMEONE_ELSE]}
        value={choice}
        onChange={(picked) =>
          onChange(picked === BORROWER ? { role: "borrower", name: borrowerName } : { role: "other", name: "" })
        }
        error={choice === SOMEONE_ELSE ? undefined : error}
      />
      {choice === SOMEONE_ELSE && (
        <PlainField
          label="Owner's full name"
          className="sm:col-span-2"
          value={owner?.name ?? ""}
          onChange={(name) => onChange({ role: "other", name })}
          error={error}
        />
      )}
    </>
  )
}

/** Which option is picked, or "" before one is. */
function ownerChoice(owner: Owner | null): string {
  if (!owner) return ""
  return owner.role === "borrower" ? BORROWER : SOMEONE_ELSE
}
