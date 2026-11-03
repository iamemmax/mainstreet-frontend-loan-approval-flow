"use client"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EmptyState, ErrorState } from "../empty-state"
import { DataTablePagination } from "./pagination"
import type { TableState } from "./use-table-state"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match the library's
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Numeric columns are right-aligned. */
    align?: "left" | "right" | "center"
    className?: string
    /** Column width hint for the loading skeleton. */
    skeletonWidth?: string
  }
}

interface DataTableProps<TData, S extends string> {
  columns: ColumnDef<TData>[]
  data: TData[] | undefined
  total: number | undefined
  state: TableState<S>
  /** Column ids that can be sorted server-side; must be the API's sort field names. */
  sortable?: readonly S[]
  getRowId: (row: TData) => string
  getRowHref?: (row: TData) => string
  /** Instead of navigating, do something with the row, e.g. open a preview sheet. */
  onRowClick?: (row: TData) => void
  /** The row whose preview is open, kept highlighted. */
  activeRowId?: string | null
  isLoading: boolean
  isFetching?: boolean
  error?: unknown
  onRetry?: () => void
  emptyState?: ReactNode
  /** Card title, e.g. "All applications". */
  title?: ReactNode
  /** Short facts beside the title, joined with dots: ["113 in total", "Sorted by last update"]. */
  meta?: ReactNode[]
  /** Search and filters, shown in the card header above the table. */
  toolbar?: ReactNode
  bulkActions?: (selected: TData[], clear: () => void) => ReactNode
  pageSizeOptions?: number[]
  "aria-label": string
  className?: string
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const

export function DataTable<TData, S extends string>({
  columns,
  data,
  total,
  state,
  sortable = [],
  getRowId,
  getRowHref,
  onRowClick,
  activeRowId,
  isLoading,
  isFetching,
  error,
  onRetry,
  emptyState,
  title,
  meta,
  toolbar,
  bulkActions,
  pageSizeOptions,
  className,
  ...aria
}: DataTableProps<TData, S>) {
  const router = useRouter()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Selection is per page; clear it whenever the page of data changes.
  useEffect(() => setRowSelection({}), [state.page, state.pageSize, state.sort, state.dir, total])

  const allColumns = useMemo<ColumnDef<TData>[]>(() => {
    if (!bulkActions) return columns
    return [
      {
        id: "__select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all rows on this page"
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        meta: { className: "w-10" },
      },
      ...columns,
    ]
  }, [columns, bulkActions])

  const table = useReactTable({
    data: data ?? [],
    columns: allColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: total ?? 0,
    state: {
      pagination: { pageIndex: state.page - 1, pageSize: state.pageSize },
      sorting: [{ id: state.sort, desc: state.dir === "desc" }],
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: !!bulkActions,
  })

  const selected = table.getSelectedRowModel().rows.map((r) => r.original)
  const showSkeleton = isLoading && !data
  const rows = table.getRowModel().rows

  return (
    <div
      className={cn("rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]", className)}
    >
      {(title || toolbar) && (
        <div className="space-y-4 border-b px-5 py-5 sm:px-6">
          {title && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
              {meta?.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                  <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
                  {m}
                </span>
              ))}
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className="p-3 sm:p-5">
        <div className="overflow-hidden rounded-xl border border-border/80">
          {bulkActions && selected.length > 0 && (
            <div className="flex items-center gap-3 border-b bg-muted/50 px-3 py-2 text-sm">
              <span className="tabular font-medium">{selected.length} selected</span>
              {bulkActions(selected, () => setRowSelection({}))}
            </div>
          )}
          <Table
            aria-label={aria["aria-label"]}
            aria-busy={isFetching || isLoading}
            containerClassName="max-h-[min(70vh,52rem)] overflow-auto"
          >
            <TableHeader className="sticky top-0 z-10 bg-muted/60 shadow-[inset_0_-1px_0_var(--border)] backdrop-blur [&_tr]:border-b-0">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta
                    const id = header.column.id as S
                    const canSort = sortable.includes(id)
                    const active = state.sort === id
                    const content = header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(ALIGN[meta?.align ?? "left"], meta?.className)}
                        aria-sort={
                          active ? (state.dir === "asc" ? "ascending" : "descending") : canSort ? "none" : undefined
                        }
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={() => state.toggleSort(id)}
                            className={cn(
                              "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 tracking-[inherit] uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              meta?.align === "right" && "flex-row-reverse",
                              active && "text-foreground",
                            )}
                          >
                            {content}
                            {active ? (
                              state.dir === "asc" ? (
                                <ArrowUp className="size-3" aria-hidden />
                              ) : (
                                <ArrowDown className="size-3" aria-hidden />
                              )
                            ) : (
                              <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                            )}
                          </button>
                        ) : (
                          content
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className={cn("transition-opacity", isFetching && !showSkeleton && "opacity-60")}>
              {showSkeleton ? (
                Array.from({ length: Math.min(state.pageSize, 10) }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {allColumns.map((col, j) => (
                      <TableCell
                        key={j}
                        className={cn(col.meta?.align === "right" && "text-right", col.meta?.className)}
                      >
                        <Skeleton
                          className={cn(
                            "h-4",
                            col.meta?.align === "right" && "ml-auto",
                            col.meta?.skeletonWidth ?? "w-24",
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error && !data ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={allColumns.length}>
                    <ErrorState error={error} onRetry={onRetry} size="sm" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={allColumns.length}>
                    {emptyState ?? (
                      <EmptyState
                        size="sm"
                        icon={<SearchX aria-hidden />}
                        title="No results"
                        description="Try adjusting or clearing your filters."
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const href = getRowHref?.(row.original)
                  const activate = onRowClick
                    ? () => onRowClick(row.original)
                    : href
                      ? () => router.push(href)
                      : undefined
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      aria-current={activeRowId === row.id || undefined}
                      className={cn(
                        activate &&
                          "cursor-pointer hover:bg-primary/[0.025] focus-visible:bg-primary/[0.04] focus-visible:outline-none",
                        // The open row keeps a plum edge so you can see which one the sheet is showing.
                        "aria-[current=true]:bg-primary/[0.05] aria-[current=true]:[&>td:first-child]:shadow-[inset_3px_0_0_var(--primary)]",
                      )}
                      tabIndex={activate ? 0 : undefined}
                      onClick={activate}
                      onKeyDown={
                        activate ? (e) => e.key === "Enter" && e.target === e.currentTarget && activate() : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              ALIGN[meta?.align ?? "left"],
                              meta?.align === "right" && "tabular",
                              meta?.className,
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination state={state} total={total} pageSizeOptions={pageSizeOptions} loading={showSkeleton} />
      </div>
    </div>
  )
}
