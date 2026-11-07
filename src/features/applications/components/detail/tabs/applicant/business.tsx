"use client"

import type { ReactNode } from "react"
import { findSector } from "../../../../schemas/business"
import type { Application } from "../../../../types"
import { Facts, Section } from "../../ui"

/** What the customer's business does and where it operates. Hidden for a Retail customer with no business recorded. */
export function BusinessProfile({ app }: { app: Application }) {
  const { applicant, businessDescription, businessAddress } = app
  const facts: [string, ReactNode][] = []
  if (applicant.kind === "business") {
    facts.push(["Sector", applicant.sector])
    facts.push([findSector(applicant.sector)?.activityLabel ?? "Activity", applicant.activity])
  }
  if (businessAddress) facts.push(["Business address", businessAddress])
  if (facts.length === 0 && !businessDescription) return null

  return (
    <Section title="Business">
      <div className="space-y-5">
        {businessDescription && <p className="text-[15px] leading-relaxed text-pretty">{businessDescription}</p>}
        {facts.length > 0 && <Facts items={facts} />}
      </div>
    </Section>
  )
}
