"use client"

import { CircleAlert, CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { REQUIRED_DOCUMENTS } from "../../../schemas/application"
import type { Application } from "../../../types"
import { requiredChecks } from "../../../utils/checks"
import { RailSection } from "./ui"

/** What's on file, with a progress bar so gaps stand out at a glance. */
export function Checklist({ app }: { app: Application }) {
  const passed = new Set(app.verification.filter((v) => v.status === "passed").map((v) => v.kind))
  const checks = requiredChecks(app)
  const missingDocs = REQUIRED_DOCUMENTS[app.segment].filter((t) => !app.documents.some((d) => d.type === t))
  const items: { label: string; ok: boolean; detail: string }[] = [
    {
      label: "Documents",
      ok: missingDocs.length === 0,
      detail: missingDocs.length ? `${missingDocs.length} missing` : "All received",
    },
    {
      label: "Guarantor",
      ok: app.guarantors.length > 0,
      detail: app.guarantors.length ? `${app.guarantors.length} recorded` : "Missing",
    },
    { label: "Next of kin", ok: !!app.nextOfKin, detail: app.nextOfKin ? "Recorded" : "Missing" },
    {
      label: "KYC & bureau checks",
      ok: checks.every((c) => passed.has(c)),
      detail: `${checks.filter((c) => passed.has(c)).length} of ${checks.length} passed`,
    },
    { label: "Credit assessment", ok: !!app.assessment, detail: app.assessment ? "Saved" : "Not yet" },
  ]
  const done = items.filter((i) => i.ok).length

  return (
    <RailSection
      title="Checklist"
      aside={
        <span className="tabular text-xs font-medium text-muted-foreground">
          {done} of {items.length} complete
        </span>
      }
    >
      <div className="flex gap-1" aria-hidden>
        {items.map((i) => (
          <span key={i.label} className={cn("h-1 flex-1 rounded-full", i.ok ? "bg-success" : "bg-muted")} />
        ))}
      </div>
      <ul className="space-y-2.5 text-sm">
        {items.map(({ label, ok, detail }) => (
          <li key={label} className="flex items-center gap-2.5">
            {ok ? (
              <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <CircleAlert className="size-4 shrink-0 text-warning" aria-hidden />
            )}
            <span className="flex-1">{label}</span>
            <span className={cn("text-xs", ok ? "text-muted-foreground" : "font-medium text-warning")}>{detail}</span>
          </li>
        ))}
      </ul>
    </RailSection>
  )
}
