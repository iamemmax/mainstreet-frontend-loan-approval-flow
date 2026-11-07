"use client"

import { Building2, Eye, FileText, Mail, MapPin, Phone, UserRound } from "lucide-react"
import { useState, type ReactNode } from "react"
import { MaskedValue } from "@/components/shared/masked-value"
import { MoneyText } from "@/components/shared/money-text"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format/date"
import { formatPercent } from "@/lib/format/money"
import type { Application } from "../../../types"
import { Facts, Section } from "../ui"
import { BusinessProfile } from "./applicant/business"
import { Collateral } from "./applicant/collateral"
import { Guarantors, NextOfKin } from "./applicant/people"
import { Statements } from "./applicant/statements"
import { DocumentViewer } from "../../preview/document-viewer"
import { documentViewerItems } from "../../preview/viewer-items"

export function ApplicantTab({ app }: { app: Application }) {
  const a = app.applicant
  const name =
    a.kind === "business" ? a.businessName : [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ")
  const ids: [string, ReactNode][] =
    a.kind === "business"
      ? [
          [
            "RC number",
            <span key="rc" className="font-mono">
              {a.rcNumber}
            </span>,
          ],
          [
            "TIN",
            <span key="tin" className="font-mono">
              {a.tin}
            </span>,
          ],
          ["Promoter BVN", <MaskedValue key="b" value={a.promoter.bvn} kind="bvn" />],
          ["Promoter NIN", <MaskedValue key="n" value={a.promoter.nin} kind="nin" />],
        ]
      : [
          ["BVN", <MaskedValue key="b" value={a.bvn} kind="bvn" />],
          ["NIN", <MaskedValue key="n" value={a.nin} kind="nin" />],
          ["Date of birth", formatDate(a.dateOfBirth)],
          ["Gender", a.gender === "female" ? "Female" : "Male"],
        ]

  // The current account the details were taken from, where the loan is paid.
  const account: [string, ReactNode] = [
    "Current account",
    <span key="acct" className="font-mono">
      {app.accountNumber}
    </span>,
  ]

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
            {a.kind === "business" ? (
              <Building2 className="size-6" aria-hidden />
            ) : (
              <UserRound className="size-6" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{name}</h2>
              <p className="text-sm text-muted-foreground">
                {a.kind === "business"
                  ? `${a.sector} · ${a.yearsInOperation} years in operation · promoter ${a.promoter.name}`
                  : `${app.employment?.jobTitle ?? "—"} at ${app.employment?.employerName ?? "—"}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                <Phone className="size-3.5" aria-hidden />
                <MaskedValue value={a.phone} kind="phone" className="text-foreground" />
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" aria-hidden />
                <span className="text-foreground">{a.email}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                <span className="text-foreground">{a.address}</span>
              </span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t @2xl:grid-cols-4 [&>div]:border-border/70 [&>div]:px-6 [&>div]:py-4 @2xl:[&>div:not(:last-child)]:border-r @max-2xl:[&>div:nth-child(odd)]:border-r @max-2xl:[&>div:nth-child(-n+2)]:border-b">
          {[account, ...ids].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[13px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-[15px] font-medium whitespace-nowrap">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t px-6 py-3 text-xs text-muted-foreground">
          Identity numbers stay masked until revealed. Every reveal is recorded in the audit trail.
        </p>
      </Card>

      <BusinessProfile app={app} />

      <div className="grid gap-5 @4xl:grid-cols-2">
        {app.employment ? (
          <Section title="Employment">
            <Facts
              items={[
                ["Employer", app.employment.employerName],
                ["Sector", app.employment.sector],
                ["Job title", app.employment.jobTitle],
                [
                  "Employed since",
                  `${formatDate(app.employment.employmentStartDate, "MMM yyyy")} · ${Math.max(0, Math.floor((Date.now() - new Date(app.employment.employmentStartDate).getTime()) / (365.25 * 86_400_000)))} years`,
                ],
                ["Monthly net income", <MoneyText key="i" value={app.employment.monthlyNetIncome} />],
                ["Salary bank", app.employment.salaryBank],
              ]}
            />
          </Section>
        ) : app.business ? (
          <Section title="Business financials" description="Monthly averages from 12 months of statements">
            <Facts
              items={[
                ["Revenue", <MoneyText key="r" value={app.business.monthlyRevenue} />],
                ["Expenses", <MoneyText key="e" value={app.business.monthlyExpenses} />],
                [
                  "Net cash flow",
                  <MoneyText key="n" value={app.business.monthlyRevenue - app.business.monthlyExpenses} />,
                ],
                [
                  "Margin",
                  formatPercent(
                    (app.business.monthlyRevenue - app.business.monthlyExpenses) /
                      Math.max(1, app.business.monthlyRevenue),
                    0,
                  ),
                ],
                ["Annual turnover", <MoneyText key="t" value={app.business.annualTurnover} format="compact" />],
                ["Primary bank", app.business.primaryBank],
              ]}
            />
          </Section>
        ) : (
          <Section title="Income">
            <p className="text-sm text-muted-foreground">No income information captured.</p>
          </Section>
        )}

        <Guarantors guarantors={app.guarantors} />
      </div>

      <Statements app={app} name={name} />

      <div className="grid gap-5 @4xl:grid-cols-2">
        <NextOfKin nextOfKin={app.nextOfKin} />
        <Documents app={app} />
      </div>

      {(app.segment === "sme" || app.collateral.length > 0) && <Collateral app={app} />}
    </div>
  )
}
/** Every document uploaded, described in the officer's words and tied to the borrower or a guarantor. */
export function Documents({ app }: { app: Application }) {
  const [viewing, setViewing] = useState<number | null>(null)
  const name =
    app.applicant.kind === "individual"
      ? `${app.applicant.firstName} ${app.applicant.lastName}`
      : app.applicant.businessName
  const items = documentViewerItems(app, name)
  return (
    <Section
      title="Documents"
      description={app.documents.length ? `${app.documents.length} uploaded` : "No documents uploaded yet"}
      flush={items.length > 0}
    >
      {items.length > 0 && (
        <ul className="divide-y">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-4 px-6 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg bg-primary/[0.07] text-primary hover:bg-primary/[0.12] hover:text-primary"
                onClick={() => setViewing(i)}
              >
                <Eye aria-hidden /> View
              </Button>
            </li>
          ))}
        </ul>
      )}
      <DocumentViewer items={items} index={viewing} onIndexChange={setViewing} />
    </Section>
  )
}
