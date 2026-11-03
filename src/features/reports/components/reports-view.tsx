"use client"

import { useState } from "react"
import { ErrorState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { useSession } from "@/features/auth/hooks/use-session"
import { ROLE_PROFILE } from "@/lib/rbac/profiles"
import { formatDate } from "@/lib/format/date"
import { useReportsSummary } from "../hooks/use-reports"
import { REPORT_RANGES, type ReportRange, type ReportsParams, type ReportsSummary } from "../schemas/reports"
import { FinanceReport } from "./finance-report"
import { ManagementReport } from "./management-report"
import { PersonalReport } from "./personal-report"

const RANGE_LABELS: Record<ReportRange, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
  all: "All time",
}

const HEADER: Record<ReportsSummary["kind"], { title: string; description: string }> = {
  management: { title: "Reports", description: "The whole loan book: volume, drop-off, step times and performance." },
  personal: { title: "My performance", description: "Your own work over the period you choose." },
  finance: { title: "Handover report", description: "Loans passed to finance for disbursement." },
}

const ALL = "all"

export function ReportsView() {
  const { user } = useSession()
  const kind = ROLE_PROFILE[user.role].report
  const [params, setParams] = useState<ReportsParams>({ range: "90d" })
  const { data, isPending, isFetching, error, refetch } = useReportsSummary(params)
  const { data: ref } = useReferenceData()
  const set = (patch: Partial<ReportsParams>) => setParams((p) => ({ ...p, ...patch }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={HEADER[kind].title}
        description={HEADER[kind].description}
        meta={
          data && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDate(data.generatedAt, "d MMM yyyy, HH:mm")}
            </span>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2" aria-busy={isFetching}>
        <Tabs value={params.range} onValueChange={(v) => set({ range: v as ReportRange })}>
          <TabsList aria-label="Period">
            {REPORT_RANGES.map((r) => (
              <TabsTrigger key={r} value={r}>
                {RANGE_LABELS[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {kind === "management" && (
          <>
            <Select value={params.branchId ?? ALL} onValueChange={(v) => set({ branchId: v === ALL ? undefined : v })}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All branches</SelectItem>
                {ref?.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={params.productId ?? ALL}
              onValueChange={(v) => set({ productId: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Product">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All products</SelectItem>
                {ref?.products
                  .filter((p) => !params.segment || p.segment === params.segment)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={params.segment ?? ALL}
              onValueChange={(v) =>
                set({ segment: v === ALL ? undefined : (v as "retail" | "sme"), productId: undefined })
              }
            >
              <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Segment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All segments</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="sme">SME</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : kind === "management" ? (
        <ManagementReport data={data?.kind === "management" ? data : undefined} loading={isPending} />
      ) : kind === "finance" ? (
        <FinanceReport data={data?.kind === "finance" ? data : undefined} loading={isPending} />
      ) : (
        <PersonalReport data={data?.kind === "personal" ? data : undefined} loading={isPending} />
      )}
    </div>
  )
}
