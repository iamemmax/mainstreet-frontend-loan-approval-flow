"use client"

import { TriangleAlert } from "lucide-react"
import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { Application } from "../../../types"
import { DTI_LIMIT, scoreApplication } from "../../../utils/scorecard"
import { CreditHistorySummary } from "../../credit-history-summary"
import { RailRow, RailSection } from "./ui"

const REC = { approve: "Approve", refer: "Approve with conditions", decline: "Decline" } as const

type Pricing = Parameters<typeof scoreApplication>[1]

/** Score, affordability and the top risks. Hidden until there is an assessment or a credit report. */
export function CreditView({ app, product }: { app: Application; product?: Pricing }) {
  const result = product && app.assessment ? scoreApplication(app, product) : null
  const risks =
    result?.factors
      .filter((f) => f.points < 0)
      .sort((a, b) => a.points - b.points)
      .slice(0, 3) ?? []
  const dtiOver = result?.dti != null && result.dti > DTI_LIMIT
  if (!result && !app.creditHistory) return null

  return (
    <RailSection title="Credit view">
      {result && (
        <>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border/70">
            <div className="px-3.5 py-3">
              <div className="tabular text-2xl leading-none font-bold">{result.score}</div>
              <div className="mt-1.5 text-xs text-muted-foreground">Score of 1000</div>
            </div>
            <div className="border-l border-border/70 px-3.5 py-3">
              <div className={cn("tabular text-2xl leading-none font-bold", dtiOver && "text-destructive")}>
                {result.dti === null ? "—" : formatPercent(result.dti, 0)}
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                Debt-to-income · {formatPercent(DTI_LIMIT, 0)} limit
              </div>
            </div>
          </div>
          <dl className="space-y-2">
            <RailRow label="System recommends">{REC[result.recommendation]}</RailRow>
            <RailRow label="Analyst recommends">
              {app.assessment?.recommendation ? REC[app.assessment.recommendation] : "—"}
            </RailRow>
          </dl>
          {risks.length > 0 && (
            <ul className="space-y-1.5">
              {risks.map((f) => (
                <li key={f.label} className="flex gap-2 text-[13px] text-muted-foreground">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  <span className="text-pretty">{f.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {app.creditHistory && <CreditHistorySummary history={app.creditHistory} />}
    </RailSection>
  )
}
