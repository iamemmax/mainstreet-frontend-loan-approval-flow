"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Download } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { Can } from "@/components/shared/can"
import { DataTable } from "@/components/shared/data-table/data-table"
import { useTableState } from "@/components/shared/data-table/use-table-state"
import { FilterBar, useFilterState, type FilterDef } from "@/components/shared/filter-bar"
import { ToneBadge } from "@/components/shared/status-badge"
import type { Tone } from "@/components/shared/tone"
import { Button } from "@/components/ui/button"
import { useAuditEvents } from "@/features/audit/hooks/use-audit-events"
import type { AuditEvent } from "@/features/audit/types"
import { downloadCsv } from "@/lib/export/csv"
import { formatDate, formatDateTime } from "@/lib/format/date"
import { useUsers } from "../hooks/use-reference-data"
import { AdminPage } from "./admin-page"

const ACTIONS = [
  "application.created",
  "application.submitted",
  "verification.completed",
  "workflow.approve",
  "workflow.reject",
  "workflow.return",
  "workflow.request_info",
  "workflow.escalate",
  "workflow.auto_escalated",
  "workflow.blocked",
  "offer.sent",
  "offer.accepted",
  "handover.ready",
]

const FILTER_SHAPE: readonly FilterDef[] = [
  { type: "faceted", key: "action", label: "Action", options: [] },
  { type: "faceted", key: "actorId", label: "User", options: [] },
  { type: "dateRange", fromKey: "from", toKey: "to", label: "Date" },
]

function toneFor(action: string): Tone {
  if (/reject|blocked/.test(action)) return "danger"
  if (/return|request_info|escalat/.test(action)) return "warning"
  if (/approve|accepted|ready/.test(action)) return "success"
  return "neutral"
}

const label = (action: string) =>
  action
    .split(".")
    .pop()!
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())

const columns: ColumnDef<AuditEvent>[] = [
  {
    id: "at",
    header: "When",
    cell: ({ row }) => (
      <time dateTime={row.original.at} className="tabular whitespace-nowrap text-muted-foreground">
        {formatDateTime(row.original.at)}
      </time>
    ),
    meta: { skeletonWidth: "w-32" },
  },
  {
    id: "actor",
    header: "User",
    cell: ({ row }) => <span className="whitespace-nowrap font-medium">{row.original.actorName}</span>,
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => <ToneBadge tone={toneFor(row.original.action)}>{label(row.original.action)}</ToneBadge>,
  },
  {
    id: "entity",
    header: "Record",
    cell: ({ row: { original: e } }) =>
      e.entity === "application" ? (
        <Link href={`/applications/${e.entityId}`} className="font-mono text-xs hover:underline">
          {e.entityLabel}
        </Link>
      ) : (
        <span className="font-mono text-xs">{e.entityLabel}</span>
      ),
  },
  {
    id: "summary",
    header: "Details",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.summary}</span>,
  },
]

export function AuditLog() {
  const table = useTableState<"at">({ sort: "at", pageSize: 50 })
  const filters = useFilterState(FILTER_SHAPE, { onChange: () => table.setPage(1) })
  const { data: users } = useUsers()
  const defs = useMemo<FilterDef[]>(
    () =>
      FILTER_SHAPE.map((d) =>
        d.type !== "faceted"
          ? d
          : {
              ...d,
              options:
                d.key === "action"
                  ? ACTIONS.map((a) => ({ value: a, label: label(a) }))
                  : (users ?? []).map((u) => ({ value: u.id, label: u.name })),
            },
      ),
    [users],
  )
  const { data, isPending, isFetching, error, refetch } = useAuditEvents({
    page: table.page,
    pageSize: table.pageSize,
    action: filters.list("action"),
    actorId: filters.list("actorId"),
    from: filters.str("from"),
    to: filters.str("to"),
  })

  return (
    <AdminPage title="Audit log" description="An immutable record of every action taken in the system.">
      <DataTable
        title="Events"
        meta={data ? [`${data.total.toLocaleString("en-NG")} recorded`, "Newest first"] : undefined}
        toolbar={
          <FilterBar
            defs={defs}
            state={filters}
            actions={
              <Can permission="application:export">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!data?.items.length}
                  onClick={() =>
                    data &&
                    downloadCsv(
                      `audit-${formatDate(new Date(), "yyyy-MM-dd")}.csv`,
                      ["Time", "User", "Action", "Record", "Details"],
                      data.items.map((e) => [e.at, e.actorName, e.action, e.entityLabel, e.summary]),
                    )
                  }
                >
                  <Download aria-hidden /> Export
                </Button>
              </Can>
            }
          />
        }
        aria-label="Audit events"
        columns={columns}
        data={data?.items}
        total={data?.total}
        state={table}
        getRowId={(e) => e.id}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        pageSizeOptions={[25, 50, 100]}
      />
    </AdminPage>
  )
}
