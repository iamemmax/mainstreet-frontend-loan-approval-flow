"use client"

import Link from "next/link"
import type { z } from "zod"
import { MoneyText } from "@/components/shared/money-text"
import { RiskBadge, SLABadge, StatusBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { myWorkItemSchema } from "@/features/applications/api/applications"
import { formatRelative } from "@/lib/format/date"

type Item = z.infer<typeof myWorkItemSchema>

export function QueueTable({ items, showStatus }: { items: Item[]; showStatus: boolean }) {
  return (
    <Table aria-label="Queue">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-4">Application</TableHead>
          <TableHead className="hidden px-3 lg:table-cell">Product</TableHead>
          <TableHead className="px-3 text-right">Amount</TableHead>
          <TableHead className="hidden px-3 2xl:table-cell">Stage</TableHead>
          <TableHead className="px-3">{showStatus ? "Status" : "SLA"}</TableHead>
          <TableHead className="hidden px-3 sm:table-cell">Risk</TableHead>
          <TableHead className="px-4 text-right">
            <span className="sr-only">Action</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="px-4 py-3">
              <Link href={`/applications/${a.id}`} className="font-medium hover:underline">
                {a.applicantName}
              </Link>
              <div className="font-mono text-xs text-muted-foreground">{a.reference}</div>
              {a.onBehalfOfName && <div className="text-xs text-info">On behalf of {a.onBehalfOfName}</div>}
            </TableCell>
            <TableCell className="hidden px-3 lg:table-cell">
              <div className="whitespace-nowrap">{a.productName}</div>
              <div className="text-xs text-muted-foreground">{a.branchName}</div>
            </TableCell>
            <TableCell className="px-3 text-right">
              <MoneyText value={a.amountRequested} className="font-medium" />
            </TableCell>
            <TableCell className="hidden px-3 whitespace-nowrap text-muted-foreground 2xl:table-cell">
              {a.currentStageName ?? "—"}
            </TableCell>
            <TableCell className="px-3">
              {showStatus ? (
                <div className="space-y-1">
                  <StatusBadge status={a.status} />
                  <div className="text-xs text-muted-foreground">{formatRelative(a.updatedAt)}</div>
                </div>
              ) : a.sla ? (
                <SLABadge state={a.sla.state} dueAt={a.sla.dueAt} />
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="hidden px-3 sm:table-cell">
              <RiskBadge rating={a.riskRating} />
            </TableCell>
            <TableCell className="px-4 text-right">
              <Link
                href={`/applications/${a.id}`}
                className="font-medium text-success underline underline-offset-4 hover:text-success/80"
              >
                {showStatus ? "Open" : "Review"}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
