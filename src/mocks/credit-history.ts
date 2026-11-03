import type { Application, CreditFacility, CreditHistory } from "@/features/applications/types"

/** The bits of a seeded random generator this needs; scripts and handlers pass their own. */
export interface Rng {
  int: (min: number, max: number) => number
  chance: (p: number) => boolean
  pick: <T>(items: readonly T[]) => T
}

/** Fictional lenders, so no real company is shown with customers in arrears. */
const LENDERS: Record<CreditFacility["lenderType"], readonly string[]> = {
  bank: ["Crestline Bank", "Unity Trust Bank", "Harbour Commercial Bank", "Meridian Bank", "Sterling Gate Bank"],
  mfb: ["Ikeja Growth MFB", "Northern Star MFB", "Coastline MFB", "Ajo Partners MFB"],
  digital: ["QuickNaira app", "KudiNow app", "PaySwift Loans app", "CashPadi app", "Flexi Credit app"],
  cooperative: ["Market Women Cooperative", "Staff Thrift & Credit Society"],
  other: ["Equipment Leasing Co."],
}

const FACILITY_TYPES: Record<CreditFacility["lenderType"], readonly string[]> = {
  bank: ["Personal loan", "Overdraft", "Credit card", "Asset finance"],
  mfb: ["Business loan", "Group loan", "Personal loan"],
  digital: ["Instant loan", "Salary advance"],
  cooperative: ["Thrift loan"],
  other: ["Equipment lease"],
}

const DAY = 86_400_000
const round = (kobo: number, step = 1_000_00) => Math.max(step, Math.round(kobo / step) * step)

/**
 * Builds a plausible bureau report. Active facilities add up to the monthly
 * repayments the analyst recorded; the risk rating decides how clean the record is.
 */
export function buildCreditHistory(
  app: Pick<Application, "id" | "riskRating" | "assessment" | "submittedAt" | "createdAt">,
  rnd: Rng,
  pulledAt: Date,
): CreditHistory {
  const now = pulledAt.getTime()
  const risk = app.riskRating ?? "medium"
  const targetMonthly = app.assessment?.existingLoanRepayments ?? (rnd.chance(0.5) ? rnd.int(2, 12) * 10_000_00 : 0)
  const facilities: CreditFacility[] = []
  let n = 0
  const add = (
    type: CreditFacility["lenderType"],
    monthly: number,
    status: CreditFacility["status"],
    months: number,
  ) => {
    const daysPastDue = {
      performing: 0,
      late_30: rnd.int(31, 59),
      late_60: rnd.int(61, 89),
      late_90: rnd.int(91, 180),
      written_off: rnd.int(181, 540),
      closed: 0,
    }[status]
    const amount = round(monthly * months * (type === "digital" ? 0.85 : 0.75))
    const paidShare = status === "closed" ? 1 : rnd.int(15, 80) / 100
    const opened = now - rnd.int(months * 15, months * 35) * DAY
    const bureaus = (["crc", "firstcentral", "creditregistry"] as const).filter(() => rnd.chance(0.7))
    facilities.push({
      id: `${app.id}-cf-${++n}`,
      lender: rnd.pick(LENDERS[type]),
      lenderType: type,
      facilityType: rnd.pick(FACILITY_TYPES[type]),
      amount,
      outstanding: status === "closed" ? 0 : round(amount * (1 - paidShare)),
      monthlyRepayment: status === "closed" || status === "written_off" ? 0 : monthly,
      status,
      daysPastDue,
      openedAt: new Date(opened).toISOString(),
      lastReportedAt: new Date(now - rnd.int(3, 40) * DAY).toISOString(),
      bureaus: bureaus.length ? bureaus : ["crc"],
    })
  }

  // Active loans share out the recorded monthly repayments.
  if (targetMonthly > 0) {
    const count = Math.min(4, Math.max(1, Math.round(targetMonthly / 40_000_00)))
    let left = targetMonthly
    for (let i = 0; i < count; i++) {
      const last = i === count - 1
      const type = rnd.pick(
        risk === "low"
          ? (["bank", "bank", "mfb", "cooperative"] as const)
          : (["bank", "mfb", "digital", "digital"] as const),
      )
      const monthly = last ? left : round(left * (rnd.int(25, 55) / 100), 500_00)
      left -= monthly
      const late =
        risk === "high"
          ? i === 0
            ? rnd.pick(["late_60", "late_90"] as const)
            : "performing"
          : risk === "medium" && type === "digital" && rnd.chance(0.5)
            ? "late_30"
            : "performing"
      add(type, monthly, late, type === "digital" ? rnd.int(1, 3) : rnd.int(6, 24))
    }
  }
  // Past loans: mostly repaid; a high-risk record may carry a write-off.
  for (let i = rnd.int(1, 3); i > 0; i--)
    add(rnd.pick(["bank", "mfb", "digital"] as const), rnd.int(1, 8) * 10_000_00, "closed", rnd.int(3, 12))
  // A high-risk record always shows why: a write-off if nothing current is late.
  if (risk === "high" && (rnd.chance(0.5) || !facilities.some((f) => f.daysPastDue > 0)))
    add("digital", rnd.int(2, 6) * 10_000_00, "written_off", 2)

  return {
    pulledAt: pulledAt.toISOString(),
    facilities,
    enquiries6m: risk === "high" ? rnd.int(4, 9) : risk === "medium" ? rnd.int(1, 5) : rnd.int(0, 2),
  }
}

const BUREAU_CHECK = {
  crc: "bureau_crc",
  firstcentral: "bureau_firstcentral",
  creditregistry: "bureau_creditregistry",
} as const

/** Bureau check results that agree with the report: a bureau reporting arrears is flagged for review. */
export function bureauFindings(
  history: CreditHistory,
  verification: Application["verification"],
): Application["verification"] {
  return verification.map((v) => {
    const bureau = (Object.keys(BUREAU_CHECK) as (keyof typeof BUREAU_CHECK)[]).find((b) => BUREAU_CHECK[b] === v.kind)
    if (!bureau) return v
    const bad = history.facilities.filter((f) => f.bureaus.includes(bureau) && f.daysPastDue > 0)
    if (!bad.length) return { ...v, status: "passed" as const, detail: "No delinquent facilities" }
    return {
      ...v,
      status: "review" as const,
      detail: `${bad.length} facilit${bad.length === 1 ? "y" : "ies"} in arrears or written off — see Credit history`,
    }
  })
}

/** A tiny deterministic generator for handlers, seeded from a string such as the application id. */
export function seededRng(seed: string): Rng {
  let a = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min
  return { int, chance: (p) => next() < p, pick: (items) => items[Math.floor(next() * items.length)] }
}
