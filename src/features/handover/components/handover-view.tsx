"use client"

import { Download, Landmark } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Can } from "@/components/shared/can"
import { EmptyState, ErrorState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { PageHeader } from "@/components/shared/page-header"
import { usePinConfirm } from "@/components/shared/pin-confirm"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApplications, useMoveApplication } from "@/features/applications/hooks/use-applications"
import type { ApplicationListItem } from "@/features/applications/types"
import { computeOffer } from "@/features/applications/utils/offer"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { downloadCsv } from "@/lib/export/csv"
import { formatDate, formatRelative } from "@/lib/format/date"
import { formatCount, koboToNaira } from "@/lib/format/money"
import { setIntent } from "@/lib/navigation/intent"

type View = "accepted" | "ready"

export function HandoverView() {
  const [view, setView] = useState<View>("accepted")
  const accepted = useApplications({ status: ["offer_accepted"], pageSize: 100, sort: "updatedAt", dir: "asc" })
  const ready = useApplications({ status: ["ready_for_disbursement"], pageSize: 100, sort: "updatedAt", dir: "desc" })
  const { data: ref } = useReferenceData()
  const current = view === "accepted" ? accepted : ready
  const sum = (items?: ApplicationListItem[]) => items?.reduce((t, a) => t + a.offeredAmount, 0) ?? 0

  const exportAll = () => {
    if (!ready.data || !ref) return
    downloadCsv(
      `disbursement-batch-${formatDate(new Date(), "yyyy-MM-dd")}.csv`,
      [
        "Reference",
        "Customer",
        "Product",
        "Branch",
        "Principal (NGN)",
        "Fees (NGN)",
        "Net disbursement (NGN)",
        "Tenor",
        "Monthly repayment (NGN)",
        "Handed over",
      ],
      ready.data.items.map((a) => {
        const p = ref.products.find((x) => x.id === a.productId)
        const t = p ? computeOffer(p, a.offeredAmount, a.tenorMonths) : null
        return [
          a.reference,
          a.applicantName,
          a.productName,
          a.branchName,
          koboToNaira(a.offeredAmount),
          t ? koboToNaira(t.totalFees) : "",
          t ? koboToNaira(a.offeredAmount - t.totalFees) : "",
          a.tenorMonths,
          t ? koboToNaira(t.monthlyRepayment) : "",
          formatDate(a.updatedAt, "yyyy-MM-dd HH:mm"),
        ]
      }),
    )
    toast.success("Disbursement batch exported")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance handover"
        description="Accepted offers waiting for handover, and loans ready for disbursement."
        actions={
          <Can permission="handover:export">
            <Button variant="outline" onClick={exportAll} disabled={!ready.data?.items.length}>
              <Download aria-hidden /> Export disbursement batch
            </Button>
          </Can>
        }
      />
      <section aria-label="Handover summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting handover"
          tone={accepted.data?.total ? "warning" : "neutral"}
          loading={accepted.isPending}
          value={accepted.data && formatCount(accepted.data.total)}
          hint={accepted.data && <MoneyText value={sum(accepted.data.items)} format="compact" />}
        />
        <StatCard
          label="Ready for disbursement"
          loading={ready.isPending}
          value={ready.data && formatCount(ready.data.total)}
          hint={ready.data && "Loans handed over to finance"}
        />
        <StatCard
          label="Value to disburse"
          loading={ready.isPending}
          value={ready.data && <MoneyText value={sum(ready.data.items)} format="compact" />}
        />
      </section>

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="accepted">Awaiting handover</TabsTrigger>
          <TabsTrigger value="ready">Ready for disbursement</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-[0_1px_2px_0_rgb(16_24_40/0.04)] sm:p-5">
        {current.error ? (
          <ErrorState error={current.error} onRetry={() => current.refetch()} size="sm" />
        ) : current.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : current.data.items.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Landmark aria-hidden />}
            title={view === "accepted" ? "Nothing waiting for handover" : "No loans ready yet"}
            description={
              view === "accepted"
                ? "Offers the customer accepts appear here."
                : "Handed-over loans appear here for disbursement."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80">
            <Table aria-label={view === "accepted" ? "Awaiting handover" : "Ready for disbursement"}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4">Customer</TableHead>
                  <TableHead className="hidden px-3 md:table-cell">Product</TableHead>
                  <TableHead className="px-3 text-right">Principal</TableHead>
                  <TableHead className="hidden px-3 sm:table-cell">Status</TableHead>
                  <TableHead className="hidden px-3 text-right lg:table-cell">
                    {view === "accepted" ? "Accepted" : "Handed over"}
                  </TableHead>
                  <TableHead className="px-4 text-right">
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3">
                      <Link href={`/applications/${a.id}`} className="font-medium hover:underline">
                        {a.applicantName}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">{a.reference}</div>
                    </TableCell>
                    <TableCell className="hidden px-3 md:table-cell">
                      <div>{a.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.branchName} · {a.tenorMonths} mo
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-right">
                      <MoneyText value={a.offeredAmount} className="font-medium" />
                    </TableCell>
                    <TableCell className="hidden px-3 sm:table-cell">
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="tabular hidden px-3 text-right text-muted-foreground lg:table-cell">
                      {formatRelative(a.updatedAt)}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      {view === "accepted" ? (
                        <HandoverButton item={a} />
                      ) : (
                        <Link
                          href={`/applications/${a.id}`}
                          onClick={() => setIntent("applicationTab", "offer")}
                          className="font-medium text-success underline underline-offset-4"
                        >
                          View terms
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function HandoverButton({ item }: { item: ApplicationListItem }) {
  const move = useMoveApplication(item.id)
  const pin = usePinConfirm()
  return (
    <Button
      size="sm"
      onClick={() =>
        pin.confirm({
          title: "Hand over to finance",
          icon: Landmark,
          description: "Finance receives the accepted offer and can disburse. Origination ends here.",
          facts: [
            { label: "Application", value: <span className="font-mono">{item.reference}</span> },
            { label: "Customer", value: item.applicantName },
            { label: "Amount", value: <MoneyText value={item.offeredAmount} /> },
          ],
          confirmLabel: "Hand over",
          run: async (p) => {
            await move.mutateAsync({ transition: "mark_ready", pin: p })
            toast.success("Handed over for disbursement")
          },
        })
      }
    >
      Hand over
    </Button>
  )
}
