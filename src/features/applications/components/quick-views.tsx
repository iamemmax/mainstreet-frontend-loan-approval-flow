"use client"

import type { FilterState } from "@/components/shared/filter-bar"
import { SegmentedControl } from "@/components/shared/segmented-control"
import { QUICK_VIEWS } from "../hooks/use-application-list-state"

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Tabs for the common slices of the pipeline. A custom Status selection simply leaves none highlighted. */
export function QuickViews({ state }: { state: FilterState }) {
  const current = state.list("status") ?? []
  const active = QUICK_VIEWS.find((v) => same(current, v.statuses))?.id ?? ""
  return (
    <SegmentedControl
      aria-label="Quick views"
      variant="primary"
      className="[scrollbar-width:none]"
      options={QUICK_VIEWS.map((v) => ({ value: v.id, label: v.label }))}
      value={active}
      onChange={(id) => {
        const v = QUICK_VIEWS.find((q) => q.id === id)!
        state.set({ status: v.statuses.length ? v.statuses.join(",") : null })
      }}
    />
  )
}
