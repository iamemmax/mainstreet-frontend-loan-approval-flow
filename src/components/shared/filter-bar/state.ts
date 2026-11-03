"use client"

import { type LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"

export interface FacetOption {
  value: string
  label: string
}

export type FilterDef =
  | { type: "search"; key: string; placeholder: string }
  | { type: "faceted"; key: string; label: string; options: FacetOption[]; icon?: LucideIcon }
  | { type: "dateRange"; fromKey: string; toKey: string; label: string }
  | { type: "amountRange"; minKey: string; maxKey: string; label: string }

export function keysOf(def: FilterDef): string[] {
  switch (def.type) {
    case "search":
    case "faceted":
      return [def.key]
    case "dateRange":
      return [def.fromKey, def.toKey]
    case "amountRange":
      return [def.minKey, def.maxKey]
  }
}

export interface FilterStateOptions {
  /** Starting values, e.g. handed over by a dashboard link. */
  initial?: Record<string, string>
  /** Called on every change — lists use it to go back to page 1. */
  onChange?: () => void
}

/**
 * Filter values for a list of filter definitions, held in component state so
 * the URL stays clean. Values are strings; use the accessors to read them typed.
 */
export function useFilterState(defs: readonly FilterDef[], { initial, onChange }: FilterStateOptions = {}) {
  const keys = useMemo(() => defs.flatMap(keysOf), [defs])
  const [values, setValues] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(keys.map((k) => [k, initial?.[k] ?? null])),
  )

  return useMemo(() => {
    const set = (patch: Record<string, string | null>) => {
      setValues((v) => ({
        ...v,
        ...Object.fromEntries(Object.entries(patch).map(([k, val]) => [k, val === "" ? null : val])),
      }))
      onChange?.()
    }
    return {
      values,
      set,
      clear: () => set(Object.fromEntries(keys.map((k) => [k, null]))),
      activeCount: keys.filter((k) => values[k] !== null).length,
      str: (key: string) => values[key] ?? undefined,
      list: (key: string) => (values[key] ? values[key]!.split(",").filter(Boolean) : undefined),
      num: (key: string) => (values[key] && !Number.isNaN(Number(values[key])) ? Number(values[key]) : undefined),
    }
  }, [values, keys, onChange])
}

export type FilterState = ReturnType<typeof useFilterState>
