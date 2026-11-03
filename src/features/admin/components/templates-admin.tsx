"use client"

import { Copy, FileText, Save } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"
import { AdminPage } from "./admin-page"

interface Template {
  id: string
  name: string
  kind: string
  body: string
}

const VARIABLES: Record<string, string> = {
  "customer.name": "Hadiza Mohammed",
  "application.reference": "ML-RTL-2610-01390",
  "loan.amount": "₦1,500,000",
  "loan.tenor": "12 months",
  "loan.monthly_repayment": "₦170,000",
  "loan.rate": "3.50% monthly flat",
  "loan.fees": "₦22,500",
  "offer.expires_on": "10 November 2026",
  "branch.name": "Yaba",
  "officer.name": "Adaeze Nwosu",
}

const INITIAL: Template[] = [
  {
    id: "offer-letter",
    name: "Offer letter",
    kind: "Retail & SME",
    body: `Dear {{customer.name}},

We are pleased to offer you a loan of {{loan.amount}} over {{loan.tenor}} (reference {{application.reference}}).

Interest: {{loan.rate}}
Monthly repayment: {{loan.monthly_repayment}}
Upfront fees: {{loan.fees}}

This offer is valid until {{offer.expires_on}}. To accept, follow the secure link sent to your phone.

Yours faithfully,
{{officer.name}}
{{branch.name}} Branch, ${BRAND.bankName}`,
  },
  {
    id: "loan-agreement",
    name: "Loan agreement",
    kind: "Retail & SME",
    body: `LOAN AGREEMENT — {{application.reference}}

This agreement is between ${BRAND.bankLegalName} ("the Lender") and {{customer.name}} ("the Borrower").

1. Principal: {{loan.amount}}
2. Tenor: {{loan.tenor}}
3. Pricing: {{loan.rate}}
4. Repayment: {{loan.monthly_repayment}} monthly by direct debit.
5. Fees of {{loan.fees}} are deducted at disbursement.`,
  },
  {
    id: "decline-letter",
    name: "Decline letter",
    kind: "Retail & SME",
    body: `Dear {{customer.name}},

Thank you for applying to ${BRAND.bankShortName} (reference {{application.reference}}). After careful review, we are unable to approve your application at this time.

You may reapply after 90 days. For questions, contact {{officer.name}} at our {{branch.name}} branch.`,
  },
]

function render(body: string) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => VARIABLES[k] ?? `[unknown: ${k}]`)
}

export function TemplatesAdmin() {
  const [templates, setTemplates] = useState(INITIAL)
  const [activeId, setActiveId] = useState(INITIAL[0].id)
  const active = templates.find((t) => t.id === activeId)!
  const unknown = [...active.body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).filter((k) => !(k in VARIABLES))

  return (
    <AdminPage title="Templates" description="Offer letter, agreement and decline templates, with live preview.">
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Templates" className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                t.id === activeId ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50",
              )}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-sm font-medium">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.kind}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit · {active.name}</CardTitle>
              <CardDescription>Use {"{{variable}}"} placeholders. Click one to copy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                aria-label={`${active.name} template`}
                rows={16}
                className="font-mono text-xs"
                value={active.body}
                onChange={(e) =>
                  setTemplates((ts) => ts.map((t) => (t.id === active.id ? { ...t, body: e.target.value } : t)))
                }
              />
              {unknown.length > 0 && (
                <p className="text-xs text-destructive">Unknown variables: {unknown.join(", ")}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(VARIABLES).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      navigator.clipboard?.writeText(`{{${k}}}`).then(
                        () => toast.success(`Copied {{${k}}}`),
                        () => undefined,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted"
                  >
                    <Copy className="size-3" aria-hidden />
                    {k}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <Button disabled={unknown.length > 0} onClick={() => toast.success(`${active.name} saved`)}>
                  <Save aria-hidden /> Save template
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Rendered with sample application data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background p-6 text-sm leading-relaxed whitespace-pre-line shadow-xs">
                {render(active.body)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPage>
  )
}
