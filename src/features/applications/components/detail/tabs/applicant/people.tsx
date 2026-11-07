"use client"

import { Phone } from "lucide-react"
import { MaskedValue } from "@/components/shared/masked-value"
import { formatDate } from "@/lib/format/date"
import { formatNaira } from "@/lib/format/money"
import type { Application } from "../../../../types"
import { Avatar, Section } from "../../ui"

/** The guarantors who stand behind the loan, with their income where captured. */
export function Guarantors({ guarantors }: { guarantors: Application["guarantors"] }) {
  return (
    <Section
      title="Guarantors"
      description={guarantors.length ? undefined : "No guarantor recorded"}
      flush={guarantors.length > 0}
    >
      {guarantors.length > 0 && (
        <ul className="divide-y">
          {guarantors.map((guarantor, i) => (
            <Person
              key={i}
              name={guarantor.name}
              role={guarantor.relationship}
              lines={[bornOn(guarantor.dateOfBirth), guarantorWork(guarantor), guarantor.address]}
              phone={guarantor.phone}
            />
          ))}
        </ul>
      )}
    </Section>
  )
}

/** Who to contact about the applicant if they can't be reached. */
export function NextOfKin({ nextOfKin }: { nextOfKin: Application["nextOfKin"] }) {
  return (
    <Section title="Next of kin" description={nextOfKin ? undefined : "Not recorded"} flush={!!nextOfKin}>
      {nextOfKin && (
        <ul>
          <Person
            name={nextOfKin.name}
            role={nextOfKin.relationship}
            lines={[bornOn(nextOfKin.dateOfBirth), nextOfKin.address]}
            phone={nextOfKin.phone}
          />
        </ul>
      )}
    </Section>
  )
}

/** "Born 4 Mar 1985", from the BVN record; blank when the record had no date. */
function bornOn(dateOfBirth: string | null): string {
  return dateOfBirth ? `Born ${formatDate(dateOfBirth, "d MMM yyyy")}` : ""
}

/** "Trader · ₦250,000/month", leaving out whatever wasn't captured. */
function guarantorWork(guarantor: Application["guarantors"][number]): string {
  const income = guarantor.monthlyIncome !== null ? `${formatNaira(guarantor.monthlyIncome)}/month` : null
  return [guarantor.occupation, income].filter(Boolean).join(" · ")
}

function Person({ name, role, lines, phone }: { name: string; role: string; lines: string[]; phone: string }) {
  return (
    <li className="flex gap-4 px-6 py-4">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="font-semibold">{name}</span>
          <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
            <Phone className="size-3.5" aria-hidden />
            <MaskedValue value={phone} kind="phone" className="text-foreground" />
          </span>
        </div>
        <div className="text-[13px] font-medium text-primary">{role}</div>
        {lines.filter(Boolean).map((line) => (
          <div key={line} className="mt-0.5 text-sm text-muted-foreground">
            {line}
          </div>
        ))}
      </div>
    </li>
  )
}
