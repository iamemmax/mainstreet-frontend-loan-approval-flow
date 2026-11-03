import type { CreditFacility, CreditHistory } from "../types"

export const LENDER_TYPE_LABELS: Record<CreditFacility["lenderType"], string> = {
  bank: "Bank",
  mfb: "Microfinance bank",
  digital: "Loan app",
  cooperative: "Cooperative",
  other: "Other lender",
}

export const FACILITY_STATUS: Record<
  CreditFacility["status"],
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; rank: number }
> = {
  performing: { label: "Up to date", tone: "success", rank: 0 },
  closed: { label: "Closed", tone: "neutral", rank: 0 },
  late_30: { label: "30+ days late", tone: "warning", rank: 1 },
  late_60: { label: "60+ days late", tone: "danger", rank: 2 },
  late_90: { label: "90+ days late", tone: "danger", rank: 3 },
  written_off: { label: "Written off", tone: "danger", rank: 4 },
}

export const BUREAU_LABELS = { crc: "CRC", firstcentral: "FirstCentral", creditregistry: "CreditRegistry" } as const

/** The numbers an approver reads first: what's owed, to whom, what it costs a month, and the worst behaviour. */
export function summariseCreditHistory(history: CreditHistory) {
  const active = history.facilities.filter((f) => f.status !== "closed")
  const worst = history.facilities.reduce<CreditFacility | null>(
    (w, f) => (!w || FACILITY_STATUS[f.status].rank > FACILITY_STATUS[w.status].rank ? f : w),
    null,
  )
  return {
    active,
    closed: history.facilities.length - active.length,
    outstanding: active.reduce((t, f) => t + f.outstanding, 0),
    monthly: active.reduce((t, f) => t + f.monthlyRepayment, 0),
    lenders: new Set(active.map((f) => f.lender)).size,
    loanApps: active.filter((f) => f.lenderType === "digital").length,
    inArrears: history.facilities.filter((f) => f.daysPastDue > 0),
    worst: worst && FACILITY_STATUS[worst.status].rank > 0 ? worst : null,
  }
}
