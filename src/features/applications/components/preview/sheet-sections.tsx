"use client"

import { differenceInYears } from "date-fns"
import { Banknote, Building2, FileText, Search, ShieldCheck, UserRound, Users } from "lucide-react"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { MoneyText } from "@/components/shared/money-text"
import { RiskBadge } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format/date"
import { formatPercent } from "@/lib/format/money"
import type { Application } from "../../types"
import { requiredChecks } from "../../utils/checks"
import type { OfferTerms } from "../../utils/offer"
import { DocumentThumb } from "./document-thumb"
import { InfoGrid, SheetSection } from "./sheet-ui"
import type { ViewerItem } from "./viewer-items"

export function DocumentsSection({ items, onView }: { items: ViewerItem[]; onView: (index: number) => void }) {
  return (
    <SheetSection
      icon={FileText}
      title="Documents"
      aside={items.length > 0 && <span className="text-xs text-muted-foreground">{items.length} uploaded</span>}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onView(i)}
              title={it.title}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <DocumentThumb item={it} className="size-full transition-transform duration-300 group-hover:scale-105" />
              <span className="absolute inset-x-1 bottom-1 truncate rounded bg-card/95 px-1 py-0.5 text-center text-[11px] font-semibold shadow-xs">
                {it.title}
              </span>
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/10">
                <span className="flex size-7 scale-90 items-center justify-center rounded-full bg-card opacity-0 shadow-md transition-all group-hover:scale-100 group-hover:opacity-100">
                  <Search className="size-4" aria-hidden />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </SheetSection>
  )
}

export function LoanSection({
  app,
  productName,
  terms,
  officerName,
  agentName,
}: {
  app: Application
  productName?: string
  terms: OfferTerms | null
  officerName?: string
  agentName?: string
}) {
  return (
    <SheetSection icon={Banknote} title="The loan">
      <div className="mb-3 border-b pb-3">
        <MoneyText value={app.amountRequested} className="text-2xl font-bold tracking-tight" />
        <div className="mt-0.5 text-xs text-muted-foreground">
          {productName} · {app.purpose}
        </div>
      </div>
      <InfoGrid
        items={[
          { label: "Term", value: `${app.tenorMonths} months` },
          { label: "Monthly repayment", value: terms ? <MoneyText value={terms.monthlyRepayment} /> : "—" },
          { label: "Total interest", value: terms ? <MoneyText value={terms.totalInterest} /> : "—" },
          { label: "Total repayable", value: terms ? <MoneyText value={terms.totalRepayable} /> : "—" },
          { label: "Relationship officer", value: officerName ?? "—" },
          { label: "Agent", value: agentName ?? "Direct" },
          { label: "Applied", value: formatDate(app.createdAt, "MMM d, yyyy h:mm a"), span: true },
        ]}
      />
    </SheetSection>
  )
}

export function BorrowerSection({ app }: { app: Application }) {
  const items =
    app.applicant.kind === "individual"
      ? [
          { label: "Phone", value: app.applicant.phone },
          { label: "Email", value: app.applicant.email },
          { label: "Gender", value: <span className="capitalize">{app.applicant.gender}</span> },
          { label: "Age", value: `${differenceInYears(new Date(), new Date(app.applicant.dateOfBirth))} years` },
          {
            label: "Monthly income",
            value: app.employment ? <MoneyText value={app.employment.monthlyNetIncome} /> : "—",
          },
          { label: "Employer", value: app.employment?.employerName ?? "—" },
          { label: "BVN", value: <span className="font-mono">•••••••{app.applicant.bvn.slice(-4)}</span> },
          { label: "State", value: app.applicant.state },
          { label: "Address", value: app.applicant.address, span: true },
        ]
      : [
          { label: "Phone", value: app.applicant.phone },
          { label: "Email", value: app.applicant.email },
          { label: "RC number", value: <span className="font-mono">{app.applicant.rcNumber}</span> },
          { label: "Sector", value: app.applicant.sector },
          { label: "Years trading", value: `${app.applicant.yearsInOperation} years` },
          { label: "Monthly revenue", value: app.business ? <MoneyText value={app.business.monthlyRevenue} /> : "—" },
          { label: "Promoter", value: app.applicant.promoter.name },
          { label: "State", value: app.applicant.state },
          { label: "Address", value: app.applicant.address, span: true },
        ]
  return (
    <SheetSection
      icon={app.applicant.kind === "business" ? Building2 : UserRound}
      title={app.applicant.kind === "business" ? "Business" : "Borrower"}
    >
      <InfoGrid items={items} />
    </SheetSection>
  )
}

export function CreditSnapshotSection({
  app,
  terms,
  stageName,
}: {
  app: Application
  terms: OfferTerms | null
  stageName?: string
}) {
  const checks = requiredChecks(app)
  const passed = app.verification.filter((v) => v.status === "passed").length
  return (
    <SheetSection icon={ShieldCheck} title="Credit snapshot" aside={<RiskBadge rating={app.riskRating} />}>
      <InfoGrid
        items={[
          { label: "Score", value: app.score === null ? "Not scored" : `${app.score} / 1000` },
          { label: "KYC & bureau checks", value: `${passed} of ${checks.length} passed` },
          { label: "Current stage", value: stageName ?? "—" },
          {
            label: "Analyst recommends",
            value: app.assessment?.recommendation ? (
              <span className="capitalize">
                {app.assessment.recommendation === "refer" ? "Approve with conditions" : app.assessment.recommendation}
              </span>
            ) : (
              "—"
            ),
          },
        ]}
      />
      {app.assessment && terms && app.employment && (
        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Repayment is {formatPercent(terms.monthlyRepayment / Math.max(1, app.employment.monthlyNetIncome), 0)} of
          monthly income.
        </p>
      )}
    </SheetSection>
  )
}

export function GuarantorsSection({ guarantors }: { guarantors: Application["guarantors"] }) {
  if (guarantors.length === 0) return null
  return (
    <SheetSection icon={Users} title={`Guarantors (${guarantors.length})`}>
      <ul className="space-y-2.5">
        {guarantors.map((g) => (
          <li key={g.name} className="flex items-center gap-3">
            <InitialsAvatar name={g.name} className="size-8 text-[11px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{g.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {g.relationship} · {g.occupation} · {g.phone}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SheetSection>
  )
}
