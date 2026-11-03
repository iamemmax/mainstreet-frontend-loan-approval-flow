"use client"

import { useMemo, useState } from "react"

export type SortDir = "asc" | "desc"

export interface TableState<S extends string> {
  page: number
  pageSize: number
  sort: S
  dir: SortDir
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  /** Clicking the active column flips direction; a new column starts descending. */
  toggleSort: (field: S) => void
}

/** Pagination and sorting held in component state — the URL stays clean. */
export function useTableState<S extends string>(defaults: {
  sort: S
  dir?: SortDir
  pageSize?: number
}): TableState<S> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaults.pageSize ?? 25)
  const [sort, setSort] = useState<S>(defaults.sort)
  const [dir, setDir] = useState<SortDir>(defaults.dir ?? "desc")

  return useMemo(
    () => ({
      page,
      pageSize,
      sort,
      dir,
      setPage: (p) => setPage(Math.max(1, p)),
      setPageSize: (size) => {
        setPageSize(size)
        setPage(1)
      },
      toggleSort: (field) => {
        setDir(sort === field ? (dir === "asc" ? "desc" : "asc") : "desc")
        setSort(field)
        setPage(1)
      },
    }),
    [page, pageSize, sort, dir],
  )
}
