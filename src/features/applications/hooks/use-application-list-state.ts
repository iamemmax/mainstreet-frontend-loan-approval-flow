"use client"

import { CircleDot, Layers, Package, ShieldAlert, Timer, UserRound } from "lucide-react"
import { useMemo, useState } from "react"
import { useFilterState, type FilterDef } from "@/components/shared/filter-bar"
import { useTableState } from "@/components/shared/data-table/use-table-state"
import { takeIntent } from "@/lib/navigation/intent"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { APPLICATION_SORT_FIELDS } from "../schemas/application"
import { APPLICATION_STATUSES, STATUS_LABELS } from "../schemas/status"
import type { ApplicationListParams } from "../types"

/** Filter keys are fixed so URL parsing never depends on loaded reference data. */
const FILTER_SHAPE: readonly FilterDef[] = [
  { type: "search", key: "q", placeholder: "Search reference, name, BVN, phone" },
  { type: "faceted", key: "status", label: "Status", options: [], icon: CircleDot },
  { type: "faceted", key: "segment", label: "Segment", options: [], icon: Layers },
  { type: "faceted", key: "productId", label: "Product", options: [], icon: Package },
  { type: "faceted", key: "officerId", label: "Officer", options: [], icon: UserRound },
  { type: "faceted", key: "risk", label: "Risk", options: [], icon: ShieldAlert },
  { type: "faceted", key: "sla", label: "SLA", options: [], icon: Timer },
]

/** One-click views over the status filter. Each is just a preset; the Status chip still shows what's on. */
export const QUICK_VIEWS = [
  { id: "all", label: "All", statuses: [] },
  {
    id: "progress",
    label: "In progress",
    statuses: ["submitted", "in_verification", "in_assessment", "returned", "more_info_requested"],
  },
  { id: "approval", label: "Awaiting approval", statuses: ["pending_approval"] },
  { id: "offers", label: "Offers", statuses: ["approved", "offer_sent", "offer_accepted"] },
  { id: "closed", label: "Closed", statuses: ["ready_for_disbursement", "rejected"] },
] as const

type SortField = (typeof APPLICATION_SORT_FIELDS)[number]

/**
 * List state for applications: paging, sorting and filters, mapped into the
 * API's query params. A dashboard link can hand over starting filters.
 */
export function useApplicationListState() {
  const [intent] = useState(() => takeIntent("applications"))
  const sort = APPLICATION_SORT_FIELDS.includes(intent?.sort as SortField) ? (intent!.sort as SortField) : "updatedAt"
  const table = useTableState<SortField>({ sort, dir: intent?.dir ?? "desc" })
  const filters = useFilterState(FILTER_SHAPE, { initial: intent?.filters, onChange: () => table.setPage(1) })
  const { data: ref } = useReferenceData()
  const { data: users } = useUsers()

  const defs = useMemo<FilterDef[]>(() => {
    const options: Record<string, { value: string; label: string }[]> = {
      status: APPLICATION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
      segment: [
        { value: "retail", label: "Retail" },
        { value: "sme", label: "SME" },
      ],
      productId: ref?.products.map((p) => ({ value: p.id, label: p.name })) ?? [],
      officerId:
        users?.filter((u) => u.role === "relationship_officer").map((u) => ({ value: u.id, label: u.name })) ?? [],
      risk: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
      sla: [
        { value: "on_track", label: "On track" },
        { value: "due_soon", label: "Due soon" },
        { value: "breached", label: "Breached" },
      ],
    }
    return FILTER_SHAPE.map((d) => (d.type === "faceted" ? { ...d, options: options[d.key] ?? [] } : d))
  }, [ref, users])

  const params = useMemo<ApplicationListParams>(
    () => ({
      page: table.page,
      pageSize: table.pageSize,
      sort: table.sort,
      dir: table.dir,
      q: filters.str("q"),
      status: filters.list("status") as ApplicationListParams["status"],
      segment: filters.list("segment") as ApplicationListParams["segment"],
      productId: filters.list("productId"),
      officerId: filters.list("officerId"),
      risk: filters.list("risk") as ApplicationListParams["risk"],
      sla: filters.list("sla") as ApplicationListParams["sla"],
    }),
    [table, filters],
  )

  return { table, filters, defs, params }
}
