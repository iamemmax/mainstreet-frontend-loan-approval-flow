"use client"

import { ToneBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { formatDate } from "@/lib/format/date"
import type { Application } from "../../../../types"
import { isOfferExpired } from "../../../../utils/offer"
import { OFFER_STATUS } from "../../constants"
import { Section } from "../../ui"

/** Every offer issued, newest first. Only the newest link can be accepted. */
export function OfferHistory({ offers }: { offers: Application["offers"] }) {
  const { data: users } = useUsers()
  return (
    <Section
      title="Offers issued"
      description="Each offer has its own number and link. Re-sending replaces the previous link."
      flush
    >
      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer no.</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Sent by</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...offers].reverse().map((o) => {
                const status = OFFER_STATUS[isOfferExpired(o) ? "expired" : o.status]
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-[13px] font-medium">{o.number}</TableCell>
                    <TableCell className="tabular">{formatDate(o.sentAt, "d MMM yyyy, HH:mm")}</TableCell>
                    <TableCell>{users?.find((u) => u.id === o.sentById)?.name ?? "—"}</TableCell>
                    <TableCell className="tabular">{formatDate(o.expiresAt, "d MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <ToneBadge tone={status.tone} dot>
                        {status.label}
                      </ToneBadge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Section>
  )
}
