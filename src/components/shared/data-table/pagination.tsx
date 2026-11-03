"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount } from "@/lib/format/money"
import type { TableState } from "./use-table-state"

interface Props<S extends string> {
  state: TableState<S>
  total: number | undefined
  pageSizeOptions?: number[]
  loading?: boolean
}

export function DataTablePagination<S extends string>({
  state,
  total = 0,
  pageSizeOptions = [10, 25, 50, 100],
  loading,
}: Props<S>) {
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize))
  const from = total === 0 ? 0 : (state.page - 1) * state.pageSize + 1
  const to = Math.min(total, state.page * state.pageSize)

  return (
    <div className="flex flex-col gap-3 px-1 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="tabular text-muted-foreground" aria-live="polite">
        {loading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(total)}`
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows</span>
          <Select value={String(state.pageSize)} onValueChange={(v) => state.setPageSize(Number(v))}>
            <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular text-muted-foreground">
          Page {state.page} of {pageCount}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={state.page <= 1}
            onClick={() => state.setPage(state.page - 1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={state.page >= pageCount}
            onClick={() => state.setPage(state.page + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
