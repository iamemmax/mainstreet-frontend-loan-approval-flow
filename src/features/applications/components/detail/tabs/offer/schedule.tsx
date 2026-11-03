"use client"

import { MoneyText } from "@/components/shared/money-text"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format/date"
import { type OfferTerms } from "../../../../utils/offer"

export function Schedule({ terms, start }: { terms: OfferTerms; start: Date }) {
  const principalPart = Math.round(terms.principal / terms.tenorMonths)
  const interestPart = Math.round(terms.totalInterest / terms.tenorMonths)
  let balance = terms.totalRepayable
  return (
    <div className="max-h-[30rem] overflow-auto px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="overflow-hidden rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Instalment</TableHead>
              <TableHead className="text-right">Balance after</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: terms.tenorMonths }, (_, i) => {
              const due = new Date(start.getFullYear(), start.getMonth() + i + 1, Math.min(start.getDate(), 28))
              balance = i === terms.tenorMonths - 1 ? 0 : balance - terms.monthlyRepayment
              return (
                <TableRow key={i}>
                  <TableCell className="tabular text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="tabular">{formatDate(due)}</TableCell>
                  <TableCell className="text-right">
                    <MoneyText value={principalPart} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText value={interestPart} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText value={terms.monthlyRepayment} className="font-semibold" />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <MoneyText value={Math.max(0, balance)} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter className="bg-secondary">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={2} className="font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right">
                <MoneyText value={terms.principal} className="font-semibold" />
              </TableCell>
              <TableCell className="text-right">
                <MoneyText value={terms.totalInterest} className="font-semibold" />
              </TableCell>
              <TableCell className="text-right">
                <MoneyText value={terms.totalRepayable} className="font-semibold" />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
