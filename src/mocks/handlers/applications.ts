import type { Application, ApplicationListItem, ParsedApplicationListParams } from "@/features/applications/types"
import { computeSla, getStage } from "@/features/workflow/engine"
import type { Session } from "@/features/auth/types"
import { computeOffer, offeredTerms } from "@/features/applications/utils/offer"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"
import { paginate } from "../transport"
import { canSeeApplication } from "./visibility"

export function applicantName(app: Application): string {
  return app.applicant.kind === "individual"
    ? `${app.applicant.firstName} ${app.applicant.lastName}`
    : app.applicant.businessName
}

export function toListItem(store: MockStore, app: Application, now = new Date()): ApplicationListItem {
  const { branches, products, agents } = store.reference
  const product = products.find((p) => p.id === app.productId)
  const offered = offeredTerms(app)
  const terms = product ? computeOffer(product, offered.amount, offered.tenorMonths) : null
  const def = app.workflow ? store.workflows.find((w) => w.id === app.workflow!.definitionId) : undefined
  const stage = def && app.workflow?.currentStageKey ? getStage(def, app.workflow.currentStageKey) : null
  const sla =
    stage && app.status === "pending_approval" && app.workflow?.stageEnteredAt
      ? computeSla(stage, new Date(app.workflow.stageEnteredAt), now)
      : null

  return {
    id: app.id,
    reference: app.reference,
    segment: app.segment,
    applicantName: applicantName(app),
    productId: app.productId,
    productName: product?.name ?? "—",
    status: app.status,
    amountRequested: app.amountRequested,
    tenorMonths: app.tenorMonths,
    monthlyRepayment: terms?.monthlyRepayment ?? 0,
    totalInterest: terms?.totalInterest ?? 0,
    offeredAmount: offered.amount,
    branchId: app.branchId,
    branchName: branches.find((b) => b.id === app.branchId)?.name ?? "—",
    officerId: app.officerId,
    officerName: store.users.find((u) => u.id === app.officerId)?.name ?? "—",
    agentName: agents.find((a) => a.id === app.agentId)?.name ?? null,
    riskRating: app.riskRating,
    currentStageKey: stage?.key ?? null,
    currentStageName: stage?.name ?? null,
    sla: sla ? { state: sla.state, dueAt: sla.dueAt.toISOString() } : null,
    flags: app.flags,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}

/** Applications the signed-in user may see. The rule lives in ./visibility. */
export function visibleApplications(store: MockStore, session: Session): Application[] {
  const now = new Date()
  return store.applications.filter((a) => canSeeApplication(store, session, a, now))
}

function matchesSearch(app: Application, item: ApplicationListItem, q: string): boolean {
  const needle = q.toLowerCase().trim()
  const bvn = app.applicant.kind === "individual" ? app.applicant.bvn : app.applicant.promoter.bvn
  return (
    item.reference.toLowerCase().includes(needle) ||
    item.applicantName.toLowerCase().includes(needle) ||
    bvn === needle ||
    app.applicant.phone.replace(/\D/g, "").endsWith(needle.replace(/\D/g, "") || "∅")
  )
}

const inList = <T>(list: readonly T[] | undefined, value: T) => !list?.length || list.includes(value)

export function listApplications(store: MockStore, session: Session, p: ParsedApplicationListParams) {
  const now = new Date()
  const rows = visibleApplications(store, session)
    .map((app) => ({ app, item: toListItem(store, app, now) }))
    .filter(({ app, item }) => {
      if (p.q && !matchesSearch(app, item, p.q)) return false
      if (!inList(p.status, item.status) || !inList(p.segment, item.segment)) return false
      if (!inList(p.productId, item.productId) || !inList(p.branchId, item.branchId)) return false
      if (!inList(p.officerId, item.officerId) || !inList(p.agentId, app.agentId ?? "")) return false
      if (p.stage?.length && !p.stage.includes(item.currentStageKey ?? "")) return false
      if (p.risk?.length && !(item.riskRating && p.risk.includes(item.riskRating))) return false
      if (p.sla?.length && !(item.sla && p.sla.includes(item.sla.state))) return false
      if (p.minAmount !== undefined && item.amountRequested < p.minAmount) return false
      if (p.maxAmount !== undefined && item.amountRequested > p.maxAmount) return false
      if (p.from && item.createdAt < p.from) return false
      if (p.to && item.createdAt > p.to) return false
      return true
    })
    .map(({ item }) => item)

  const dir = p.dir === "asc" ? 1 : -1
  const key = (i: ApplicationListItem): string | number =>
    p.sort === "slaDueAt" ? (i.sla?.dueAt ?? "9999") : i[p.sort]
  rows.sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    return (ka < kb ? -1 : ka > kb ? 1 : 0) * dir
  })

  return paginate(rows, p.page, p.pageSize)
}

export function getApplication(store: MockStore, session: Session, id: string): Application {
  const app = visibleApplications(store, session).find((a) => a.id === id)
  if (!app) throw new ApiError(404, "not_found", "Application not found")
  return app
}
