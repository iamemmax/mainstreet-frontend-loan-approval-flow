import { CircleCheck, TriangleAlert } from "lucide-react"
import { MoneyText } from "@/components/shared/money-text"
import { cn } from "@/lib/utils"
import type { CreditHistory } from "../types"
import { FACILITY_STATUS, summariseCreditHistory } from "../utils/credit-history"

/** One glance at the borrower's other debts: what's owed, the monthly cost, and the worst repayment behaviour. */
export function CreditHistorySummary({ history, className }: { history: CreditHistory; className?: string }) {
  const s = summariseCreditHistory(history)
  return (
    <div className={cn("space-y-2 rounded-xl border border-border/70 p-3.5 text-[13px]", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Owes other lenders</span>
        <span className="font-semibold">
          <MoneyText value={s.outstanding} /> · {s.lenders} lender{s.lenders === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Repays each month</span>
        <MoneyText value={s.monthly} className="font-semibold" />
      </div>
      {s.loanApps > 0 && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Loan apps</span>
          <span className={cn("font-semibold", s.loanApps >= 2 && "text-warning")}>{s.loanApps} active</span>
        </div>
      )}
      <p className={cn("flex items-center gap-1.5 pt-0.5 font-medium", s.worst ? "text-destructive" : "text-success")}>
        {s.worst ? (
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <CircleCheck className="size-3.5 shrink-0" aria-hidden />
        )}
        {s.worst ? `${FACILITY_STATUS[s.worst.status].label} with ${s.worst.lender}` : "Every loan paid on time"}
      </p>
    </div>
  )
}
