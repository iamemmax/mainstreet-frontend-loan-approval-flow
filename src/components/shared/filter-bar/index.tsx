"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type FilterDef, type FilterState, keysOf } from "./state"
import { AmountFilter, DateFilter, FacetedFilter, SearchFilter } from "./filters"

export { type FacetOption, type FilterDef, type FilterState, useFilterState } from "./state"

interface FilterBarProps {
  defs: readonly FilterDef[]
  state: FilterState
  /** Right-aligned slot, e.g. export or saved views. */
  actions?: ReactNode
  /** Shares the first row with the search box, e.g. quick-view tabs; the filter chips then get their own row. */
  leading?: ReactNode
  className?: string
}

/** Search plus filter chips. Sits at the top of a table card (see DataTable `toolbar`). */
export function FilterBar({ defs, state, actions, leading, className }: FilterBarProps) {
  const search = defs.find((d) => d.type === "search")
  const filters = defs.filter((d) => d.type !== "search")
  const active = filters.flatMap(keysOf).filter((k) => state.values[k] !== null).length

  const chips = (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      {filters.map((def) => {
        switch (def.type) {
          case "faceted":
            return <FacetedFilter key={def.key} def={def} state={state} />
          case "dateRange":
            return <DateFilter key={def.fromKey} def={def} state={state} />
          case "amountRange":
            return <AmountFilter key={def.minKey} def={def} state={state} />
          default:
            return null
        }
      })}
      {active > 0 && (
        <button
          type="button"
          onClick={() => state.set(Object.fromEntries(filters.flatMap(keysOf).map((k) => [k, null])))}
          className="h-9 rounded-lg px-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
        >
          Clear all ({active})
        </button>
      )}
    </div>
  )

  if (leading) {
    return (
      <div className={cn("space-y-3", className)} role="search">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {leading}
          {search && <SearchFilter def={search} state={state} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chips}
          {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3 xl:flex-row xl:items-start", className)} role="search">
      {search && <SearchFilter def={search} state={state} />}
      {chips}
      {actions && <div className="flex shrink-0 items-center gap-2 xl:ml-auto">{actions}</div>}
    </div>
  )
}
