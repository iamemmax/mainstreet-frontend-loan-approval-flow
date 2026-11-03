import { subDays, subMonths } from "date-fns"
import type { Application } from "@/features/applications/types"
import type { Session } from "@/features/auth/types"
import type {
  FinanceReport,
  ManagementReport,
  PersonalReport,
  ReportsParams,
  ReportsSummary,
} from "@/features/reports/schemas/reports"
import { DECISION_REASONS } from "@/features/workflow/engine"
import { formatNaira, formatPercent } from "@/lib/format/money"
import { APPROVED_STATUSES } from "@/features/applications/schemas/status"
import { personalFocus, ROLE_PROFILE } from "@/lib/rbac/profiles"
import type { MockStore } from "../store"
import { monthlyVolume } from "./dashboard"
import {
  acceptedOffer,
  type AuditLookup,
  auditIndex,
  DAY,
  enteredAt,
  HANDOVER_ACTIONS,
  median,
  VERIFIED_ACTIONS,
} from "./timeline"

const REASON_LABEL = new Map(
  Object.values(DECISION_REASONS).flatMap((list) => list.map((r) => [r.code, r.label] as const)),
)
const reasonLabel = (code: string) => REASON_LABEL.get(code) ?? code

interface Row {
  id: string
  name: string
  count: number
  value: number
  approved: number
  rejected: number
  disbursedValue: number
}

function group(apps: Application[], keyOf: (a: Application) => string, nameOf: (key: string) => string): Row[] {
  const rows = new Map<string, Row>()
  for (const a of apps) {
    const id = keyOf(a)
    const row = rows.get(id) ?? {
      id,
      name: nameOf(id),
      count: 0,
      value: 0,
      approved: 0,
      rejected: 0,
      disbursedValue: 0,
    }
    row.count++
    row.value += a.amountRequested
    if (APPROVED_STATUSES.includes(a.status)) row.approved++
    if (a.status === "rejected") row.rejected++
    if (a.status === "ready_for_disbursement") row.disbursedValue += a.amountRequested
    rows.set(id, row)
  }
  return [...rows.values()].sort((a, b) => b.value - a.value)
}

const sum = (list: Application[]) => ({ count: list.length, value: list.reduce((t, a) => t + a.amountRequested, 0) })
const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / DAY
const ratio = (part: number, whole: number) => (whole ? part / whole : null)

function periodStart(range: ReportsParams["range"], now: Date): Date | null {
  switch (range) {
    case "30d":
      return subDays(now, 30)
    case "12m":
      return subMonths(now, 12)
    case "all":
      return null
    default:
      return subDays(now, 90)
  }
}

/** How far an application got: 0 submitted … 6 handed over. */
function reached(a: Application, latest: AuditLookup): number {
  switch (a.status) {
    case "submitted":
    case "in_verification":
      return 0
    case "in_assessment":
      return 1
    case "pending_approval":
      return 2
    case "approved":
      return 3
    case "offer_sent":
      return 4
    case "offer_accepted":
      return 5
    case "ready_for_disbursement":
      return 6
    default:
      // Returned or rejected: as far as the evidence shows it went.
      if (a.workflow) return 2
      if (a.assessment || latest(a.id, VERIFIED_ACTIONS)) return 1
      return 0
  }
}

/** Reports depend on the role: management sees the whole book, finance its handovers, everyone else their own work. */
export function reportsSummary(
  store: MockStore,
  session: Session,
  params: ReportsParams = {},
  now = new Date(),
): ReportsSummary {
  const from = periodStart(params.range ?? "90d", now)
  const period = { from: from?.toISOString() ?? null, to: now.toISOString() }
  const inPeriod = (at: string | null | undefined): at is string =>
    !!at && (!from || Date.parse(at) >= from.getTime()) && Date.parse(at) <= now.getTime()
  const latest = auditIndex(store)
  const ctx = { store, session, now, period, inPeriod, latest }
  const { role } = session.user
  const kind = ROLE_PROFILE[role].report
  if (kind === "finance") return financeReport(ctx)
  if (kind === "management") return managementReport(ctx, params)
  return personalReport(ctx, personalFocus(role) ?? "origination")
}

interface Ctx {
  store: MockStore
  session: Session
  now: Date
  period: { from: string | null; to: string }
  inPeriod: (at: string | null | undefined) => at is string
  latest: AuditLookup
}

function managementReport({ store, now, period, inPeriod, latest }: Ctx, params: ReportsParams): ManagementReport {
  const { branches, products, agents } = store.reference
  const userName = (id: string) => store.users.find((u) => u.id === id)?.name ?? "—"
  const book = store.applications.filter(
    (a) =>
      a.status !== "draft" &&
      (!params.branchId || a.branchId === params.branchId) &&
      (!params.productId || a.productId === params.productId) &&
      (!params.segment || a.segment === params.segment),
  )
  const cohort = book.filter((a) => inPeriod(a.submittedAt))
  const verifiedAt = (a: Application) => latest(a.id, VERIFIED_ACTIONS)

  const acceptedInPeriod = book.flatMap((a) => {
    const offer = acceptedOffer(a)
    return offer && inPeriod(offer.respondedAt) ? [{ app: a, offer }] : []
  })
  const rank = new Map(cohort.map((a) => [a.id, reached(a, latest)]))
  const reachedAtLeast = (n: number) => cohort.filter((a) => rank.get(a.id)! >= n).length

  const step = (key: ManagementReport["stepTimes"][number]["key"], spans: (number | null)[]) => {
    const valid = spans.filter((d): d is number => d !== null && d >= 0)
    return { key, medianDays: median(valid), count: valid.length }
  }
  const rejections = new Map<string, number>()
  for (const a of cohort) {
    const codes = [
      ...(a.workflow?.decisions ?? []).filter((d) => d.action === "reject").map((d) => d.reasonCode),
      ...a.messages.filter((m) => m.kind === "rejection" && m.reasonCode).map((m) => m.reasonCode!),
    ]
    for (const code of codes) rejections.set(code, (rejections.get(code) ?? 0) + 1)
  }

  return {
    kind: "management",
    generatedAt: now.toISOString(),
    period,
    totals: {
      applied: sum(cohort),
      approved: sum(cohort.filter((a) => APPROVED_STATUSES.includes(a.status))),
      rejected: cohort.filter((a) => a.status === "rejected").length,
      accepted: sum(acceptedInPeriod.map((x) => x.app)),
      medianTurnaroundDays: median(
        acceptedInPeriod.filter((x) => x.app.submittedAt).map((x) => days(x.app.submittedAt!, x.offer.respondedAt!)),
      ),
    },
    funnel: (["submitted", "verified", "approval", "approved", "offer_sent", "accepted", "handed_over"] as const).map(
      (key, i) => ({ key, count: reachedAtLeast(i) }),
    ),
    stepTimes: [
      step(
        "verification",
        book.map((a) => {
          const at = verifiedAt(a)
          return inPeriod(at) && a.submittedAt ? days(a.submittedAt, at) : null
        }),
      ),
      step(
        "assessment_approval",
        book.map((a) => {
          const approvedAt = APPROVED_STATUSES.includes(a.status)
            ? a.workflow?.decisions.filter((d) => d.action === "approve").at(-1)?.at
            : undefined
          const at = verifiedAt(a)
          return inPeriod(approvedAt) && at ? days(at, approvedAt) : null
        }),
      ),
      step(
        "acceptance",
        acceptedInPeriod.map((x) => days(x.offer.sentAt, x.offer.respondedAt!)),
      ),
      step(
        "handover",
        book.map((a) => {
          const at =
            a.status === "ready_for_disbursement" ? (latest(a.id, HANDOVER_ACTIONS) ?? enteredAt(a, latest)) : undefined
          const acceptedAt = acceptedOffer(a)?.respondedAt
          return inPeriod(at) && acceptedAt ? days(acceptedAt, at) : null
        }),
      ),
    ],
    rejectionReasons: [...rejections.entries()]
      .map(([code, count]) => ({ code, label: reasonLabel(code), count }))
      .sort((a, b) => b.count - a.count),
    byBranch: group(
      cohort,
      (a) => a.branchId,
      (id) => branches.find((b) => b.id === id)?.name ?? "—",
    ),
    byProduct: group(
      cohort,
      (a) => a.productId,
      (id) => products.find((p) => p.id === id)?.name ?? "—",
    ),
    byOfficer: group(cohort, (a) => a.officerId, userName).slice(0, 10),
    byAgent: group(
      cohort.filter((a) => a.agentId),
      (a) => a.agentId!,
      (id) => agents.find((g) => g.id === id)?.name ?? "—",
    ),
  }
}

function personalReport(
  { store, session, now, period, inPeriod, latest }: Ctx,
  focus: PersonalReport["focus"],
): PersonalReport {
  const me = session.user.id
  const base = { kind: "personal" as const, focus, generatedAt: now.toISOString(), period }
  const pct = (part: number, whole: number) => (whole ? formatPercent(part / whole, 0) : "—")

  if (focus === "verification") {
    const verified = new Map<string, string>()
    let rejected = 0
    for (const e of store.audit) {
      if (e.actorId !== me || !inPeriod(e.at)) continue
      if (VERIFIED_ACTIONS.includes(e.action) && (!verified.has(e.entityId) || e.at > verified.get(e.entityId)!))
        verified.set(e.entityId, e.at)
      if (e.action === "application.rejected") rejected++
    }
    const apps = store.applications.filter((a) => verified.has(a.id))
    const flagged = apps.filter((a) => a.verification.some((v) => v.status !== "passed")).length
    const checks = apps.flatMap((a) => a.verification)
    return {
      ...base,
      figures: [
        { key: "verified", value: apps.length, note: "Verification completed by you" },
        {
          key: "verification_time",
          value: median(apps.filter((a) => a.submittedAt).map((a) => days(a.submittedAt!, verified.get(a.id)!))),
          note: "Median, submission to verified",
        },
        {
          key: "checks_flagged",
          value: flagged,
          note: `${pct(flagged, apps.length)} of files had a failed or flagged check`,
        },
        { key: "rejected_at_verification", value: rejected, note: "Declined by you before assessment" },
      ],
      breakdown: {
        title: "Check results",
        description: "Every identity, bureau and screening check on the files you verified",
        rows: [
          { label: "Passed", count: checks.filter((c) => c.status === "passed").length, tone: "success" },
          { label: "Needed review", count: checks.filter((c) => c.status === "review").length, tone: "warning" },
          { label: "Failed", count: checks.filter((c) => c.status === "failed").length, tone: "danger" },
        ],
      },
    }
  }

  if (focus === "assessment") {
    const assessed = store.applications.filter(
      (a) => a.assessment?.updatedById === me && inPeriod(a.assessment.updatedAt),
    )
    const decisions = store.applications
      .flatMap((a) => a.workflow?.decisions ?? [])
      .filter((d) => d.actorId === me && inPeriod(d.at)).length
    const decided = assessed.filter(
      (a) => a.assessment!.recommendation && (APPROVED_STATUSES.includes(a.status) || a.status === "rejected"),
    )
    const matched = decided.filter(
      (a) => (a.assessment!.recommendation === "decline") === (a.status === "rejected"),
    ).length
    const recs = (r: string) => assessed.filter((a) => a.assessment!.recommendation === r).length
    return {
      ...base,
      figures: [
        { key: "assessed", value: assessed.length, note: `${formatNaira(sum(assessed).value, "compact")} assessed` },
        {
          key: "assessment_time",
          value: median(
            assessed.flatMap((a) => {
              const at = latest(a.id, VERIFIED_ACTIONS)
              return at && at <= a.assessment!.updatedAt ? [days(at, a.assessment!.updatedAt)] : []
            }),
          ),
          note: "Median, verified to assessment saved",
        },
        { key: "decisions", value: decisions, note: "Approval decisions at your stage" },
        {
          key: "recommendation_match",
          value: ratio(matched, decided.length),
          note: `${decided.length} of your files have a final decision`,
        },
      ],
      breakdown: {
        title: "Your recommendations",
        description: "What you recommended on the files you assessed",
        rows: [
          { label: "Approve", count: recs("approve"), tone: "success" },
          { label: "Approve with conditions", count: recs("refer"), tone: "warning" },
          { label: "Decline", count: recs("decline"), tone: "danger" },
        ],
      },
    }
  }

  const mine = store.applications.filter((a) => a.officerId === me)
  const cohort = mine.filter((a) => inPeriod(a.submittedAt))
  const approved = cohort.filter((a) => APPROVED_STATUSES.includes(a.status)).length
  const rejected = cohort.filter((a) => a.status === "rejected").length
  const returnCodes = (a: Application) => [
    ...a.messages.filter((m) => m.kind === "return" && m.reasonCode).map((m) => m.reasonCode!),
    ...(a.workflow?.decisions ?? [])
      .filter((d) => d.action === "return" || d.action === "request_info")
      .map((d) => d.reasonCode),
  ]
  const returned = cohort.filter((a) => returnCodes(a).length > 0)
  const accepted = mine.filter((a) => inPeriod(acceptedOffer(a)?.respondedAt))
  const reasons = new Map<string, number>()
  for (const code of cohort.flatMap(returnCodes)) reasons.set(code, (reasons.get(code) ?? 0) + 1)
  return {
    ...base,
    figures: [
      { key: "submitted", value: cohort.length, note: `${formatNaira(sum(cohort).value, "compact")} requested` },
      { key: "approved", value: approved, note: `${pct(approved, approved + rejected)} of decided applications` },
      { key: "returned", value: returned.length, note: `${pct(returned.length, cohort.length)} of what you submitted` },
      {
        key: "accepted",
        value: sum(accepted).value,
        note: `${accepted.length} ${accepted.length === 1 ? "loan" : "loans"} accepted by customers`,
      },
    ],
    breakdown: {
      title: "Why applications came back",
      description: "Reasons given when your applications were returned or more information was requested",
      rows: [...reasons.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ label: reasonLabel(code), count, tone: "warning" as const })),
    },
  }
}

function financeReport({ store, now, period, inPeriod, latest }: Ctx): FinanceReport {
  const { branches, products } = store.reference
  const handoverAt = (a: Application) =>
    a.status === "ready_for_disbursement" ? (latest(a.id, HANDOVER_ACTIONS) ?? enteredAt(a, latest)) : null
  const handed = store.applications.filter((a) => inPeriod(handoverAt(a)))
  const totals = sum(handed)
  const rows = (keyOf: (a: Application) => string, nameOf: (id: string) => string) => {
    const by = new Map<string, Application[]>()
    for (const a of handed) by.set(keyOf(a), [...(by.get(keyOf(a)) ?? []), a])
    return [...by.entries()]
      .map(([id, list]) => ({ id, name: nameOf(id), ...sum(list) }))
      .sort((a, b) => b.value - a.value)
  }
  return {
    kind: "finance",
    generatedAt: now.toISOString(),
    period,
    totals: {
      handedOver: totals,
      medianHandoverDays: median(
        handed.flatMap((a) => {
          const acceptedAt = acceptedOffer(a)?.respondedAt
          return acceptedAt ? [days(acceptedAt, handoverAt(a)!)] : []
        }),
      ),
      waiting: sum(store.applications.filter((a) => a.status === "offer_accepted")),
      averageLoan: totals.count ? Math.round(totals.value / totals.count) : null,
    },
    monthly: monthlyVolume(
      store.applications.filter((a) => a.status === "ready_for_disbursement"),
      now,
      handoverAt,
    ),
    byBranch: rows(
      (a) => a.branchId,
      (id) => branches.find((b) => b.id === id)?.name ?? "—",
    ),
    byProduct: rows(
      (a) => a.productId,
      (id) => products.find((p) => p.id === id)?.name ?? "—",
    ),
  }
}
