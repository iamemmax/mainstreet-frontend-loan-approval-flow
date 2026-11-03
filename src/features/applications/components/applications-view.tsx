"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Download, FilePlus } from "lucide-react"
import Link from "next/link"
import { Can } from "@/components/shared/can"
import { DataTable } from "@/components/shared/data-table/data-table"
import { FilterBar } from "@/components/shared/filter-bar"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { useCan } from "@/features/auth/hooks/use-session"
import { STATUS_LABELS } from "../schemas/status"
import { APPLICATION_SORT_FIELDS } from "../schemas/application"
import { useApplications } from "../hooks/use-applications"
import { useApplicationListState } from "../hooks/use-application-list-state"
import { applicationColumns } from "./application-columns"
import { QuickViews } from "./quick-views"
import { ApplicationSheet } from "./preview/application-sheet"
import { downloadCsv } from "@/lib/export/csv"
import { formatCount, koboToNaira } from "@/lib/format/money"
import { formatDate } from "@/lib/format/date"
import { setIntent } from "@/lib/navigation/intent"

const SORT_LABEL: Record<(typeof APPLICATION_SORT_FIELDS)[number], string> = {
  reference: "reference",
  applicantName: "applicant",
  amountRequested: "amount",
  status: "status",
  createdAt: "date created",
  updatedAt: "last update",
  slaDueAt: "SLA due time",
}

export function ApplicationsView() {
  const router = useRouter()
  // Clicking a row opens a quick-look sheet; the full page is one click further.
  const [previewId, setPreviewId] = useState<string | null>(null)
  const columns = useMemo(
    () =>
      applicationColumns({
        onReview: (r) => setPreviewId(r.id),
        onOpen: (r, tab) => {
          if (tab) setIntent("applicationTab", tab)
          router.push(`/applications/${r.id}`)
        },
      }),
    [router],
  )
  const { table, filters, defs, params } = useApplicationListState()
  const { data, isPending, isFetching, error, refetch } = useApplications(params)
  // Without oversight access the server returns only this user's share, so say so.
  const seesAll = useCan("application:view_all")

  const exportRows = () =>
    data &&
    downloadCsv(
      `applications-${formatDate(new Date(), "yyyy-MM-dd")}.csv`,
      [
        "Reference",
        "Applicant",
        "Segment",
        "Product",
        "Branch",
        "Officer",
        "Amount (NGN)",
        "Tenor (months)",
        "Status",
        "Stage",
        "Risk",
        "Created",
      ],
      data.items.map((a) => [
        a.reference,
        a.applicantName,
        a.segment === "sme" ? "SME" : "Retail",
        a.productName,
        a.branchName,
        a.officerName,
        koboToNaira(a.amountRequested),
        a.tenorMonths,
        STATUS_LABELS[a.status],
        a.currentStageName,
        a.riskRating,
        formatDate(a.createdAt),
      ]),
    )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description={
          seesAll
            ? `${data ? formatCount(data.total) : "All"} Retail and SME applications across the pipeline.`
            : `${data ? `${formatCount(data.total)} applications` : "Applications"} you own, have worked on, or that are waiting on you.`
        }
        actions={
          <>
            <Can permission="application:export">
              <Button variant="outline" onClick={exportRows} disabled={!data?.items.length}>
                <Download aria-hidden /> Export
              </Button>
            </Can>
            <Can permission="application:create">
              <Button asChild>
                <Link href="/applications/new">
                  <FilePlus aria-hidden /> New application
                </Link>
              </Button>
            </Can>
          </>
        }
      />
      <DataTable
        title={filters.activeCount ? "Filtered applications" : "All applications"}
        meta={data ? [`${formatCount(data.total)} in total`, `Sorted by ${SORT_LABEL[table.sort]}`] : undefined}
        toolbar={<FilterBar defs={defs} state={filters} leading={<QuickViews state={filters} />} />}
        aria-label="Applications"
        columns={columns}
        data={data?.items}
        total={data?.total}
        state={table}
        sortable={APPLICATION_SORT_FIELDS}
        getRowId={(r) => r.id}
        onRowClick={(r) => setPreviewId(r.id)}
        activeRowId={previewId}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
      />
      <ApplicationSheet id={previewId} onClose={() => setPreviewId(null)} />
    </div>
  )
}
