import type { Application, ApplicationFlag, ApplicationStatus } from "@/features/applications/types"
import type { AuditEvent } from "@/features/audit/types"
import type { Notification } from "@/features/notifications/types"
import { computeSla, resolveRoute } from "@/features/workflow/engine"
import type { Decision, DecisionAction, Delegation, WorkflowDefinition, WorkflowState } from "@/features/workflow/types"
import type { Role } from "@/lib/rbac/roles"
import { OFFER_VALID_DAYS } from "@/features/applications/utils/offer"
import { buildReference } from "@/features/applications/utils/reference"
import {
  BANKS,
  JOB_TITLES,
  LOAN_PURPOSES,
  NAME_POOLS,
  PHONE_PREFIXES,
  RETAIL_EMPLOYERS,
  SME_NAME_PARTS,
  SME_SECTORS,
  STREETS,
  type Ethnicity,
} from "./names"
import { createRandom, type Random } from "./random"
import { AGENTS, BRANCHES, PRODUCTS } from "./reference"
import { USERS } from "./users"
import { RETAIL_WORKFLOW, SME_WORKFLOW } from "./workflows"

const HOUR = 3_600_000
const DAY = 24 * HOUR
const N = 100

const STATUS_WEIGHTS: Record<ApplicationStatus, number> = {
  draft: 18,
  submitted: 14,
  in_verification: 26,
  in_assessment: 28,
  pending_approval: 92,
  returned: 16,
  more_info_requested: 12,
  approved: 18,
  rejected: 32,
  offer_sent: 18,
  offer_accepted: 8,
  ready_for_disbursement: 44,
}

const ETHNICITY_BY_REGION: Record<string, Partial<Record<Ethnicity, number>>> = {
  "r-lagos": { yoruba: 5, igbo: 3, hausa: 1, edo_delta: 1 },
  "r-sw": { yoruba: 8, igbo: 1, edo_delta: 1 },
  "r-nc": { hausa: 4, igbo: 2, yoruba: 2, edo_delta: 1 },
  "r-ss": { edo_delta: 5, igbo: 3, yoruba: 1 },
  "r-nw": { hausa: 9, yoruba: 1 },
  "r-se": { igbo: 9, edo_delta: 1 },
}

/** Branch → owning relationship officer. */
const BRANCH_OFFICER: Record<string, string> = {
  "b-lis": "u-ro-1",
  "b-yab": "u-ro-1",
  "b-ikj": "u-ro-2",
  "b-lek": "u-ro-2",
  "b-wse": "u-ro-3",
  "b-grk": "u-ro-3",
  "b-kan": "u-ro-4",
  "b-bnc": "u-ro-5",
  "b-phc": "u-ro-6",
  "b-enu": "u-ro-6",
  "b-ibd": "u-ro-7",
  "b-abk": "u-ro-7",
}

const COMMENTS: Record<DecisionAction, readonly string[]> = {
  approve: [
    "Customer meets policy. DTI within limit and bureau reports are clean.",
    "Salary domiciled with us for 3 years; repayment capacity confirmed from statements.",
    "Recommend approval. Business cash flow supports the proposed instalment.",
    "Verified employer confirmation and payslips. No adverse records on CRC or FirstCentral.",
    "Approved subject to execution of guarantor undertaking before offer.",
    "Collateral valuation adequate at 1.4x cover. Recommend approval.",
  ],
  reject: [
    "Two delinquent facilities on CreditRegistry with outstanding balances above 90 days.",
    "Debt-to-income would exceed 55% after this facility. Outside policy.",
    "BVN details do not match the submitted identity documents.",
    "Statement analysis shows round-tripping of funds; not comfortable with the cash flow.",
  ],
  return: [
    "Payslip for the most recent month is missing. Please upload and resubmit.",
    "Employer name on the application differs from the payslip. Please correct.",
    "Guarantor form is not signed. Return for completion.",
    "Requested tenor is outside the product limit; restructure and resubmit.",
  ],
  escalate: [
    "Amount exceeds my approval authority; escalating for the next level's decision.",
    "Applicant is a family relation; escalating to avoid a conflict of interest.",
    "Policy exception on employer category required; escalating.",
  ],
  request_info: [
    "Please obtain six months of bank statements from the salary account.",
    "Need confirmation of the LPO from the issuing company before we proceed.",
    "Kindly get an explanation for the large cash withdrawals in June.",
  ],
}

const REASON_FOR: Record<DecisionAction, readonly string[]> = {
  approve: ["meets_policy", "strong_affordability", "approved_with_conditions"],
  reject: ["adverse_bureau", "insufficient_affordability", "kyc_failed", "outside_risk_appetite"],
  return: ["incomplete_documents", "data_mismatch", "other_correction", "wrong_product"],
  escalate: ["above_authority", "conflict_of_interest", "policy_exception"],
  request_info: ["bank_statement", "employer_confirmation", "clarification"],
}

const DELEGATION_START_DAYS = 3

export interface SeedResult {
  applications: Application[]
  audit: AuditEvent[]
  notifications: Notification[]
  delegations: Delegation[]
}

export function seedApplications(now: Date, count = 340): SeedResult {
  const rnd = createRandom(20261027)
  const t = now.getTime()
  const iso = (ms: number) => new Date(ms).toISOString()
  const usersByRole = (role: Role) => USERS.filter((u) => u.role === role)
  const userName = (id: string | null) =>
    id === "system" || id === null ? "System" : (USERS.find((u) => u.id === id)?.name ?? "Unknown")

  const delegation: Delegation = {
    id: "dlg-1",
    fromUserId: "u-hoc-1",
    toUserId: "u-cm-1",
    startsAt: iso(t - DELEGATION_START_DAYS * DAY),
    endsAt: iso(t + 4 * DAY),
    reason: "Annual leave — Olumide is away until next week.",
  }

  // Offer links come from their own stream so the rest of the seed stays byte-identical.
  const offerRnd = createRandom(77_000)
  let offerSeq = 0
  const hex = (n: number) => Array.from({ length: n }, () => offerRnd.int(0, 15).toString(16)).join("")
  // Numbers are placeholders until every offer exists, then assigned in the order they were sent.
  const sendOffer = (app: Draft, at: number, by: string, resend = false) => {
    const offer: Application["offers"][number] = {
      id: `ofr-${++offerSeq}`,
      number: `OFR-PENDING-${offerSeq}#`,
      token: hex(48),
      // Set to the final terms in enrich, once the tenor is fitted to income.
      amount: app.amountRequested,
      tenorMonths: app.tenorMonths,
      sentAt: iso(at),
      sentById: by,
      expiresAt: iso(at + OFFER_VALID_DAYS * DAY),
      status: "sent",
      respondedAt: null,
    }
    app.offers.push(offer)
    log(
      app,
      at,
      by,
      resend ? "application.resend_offer" : "offer.sent",
      `${resend ? "Offer re-issued" : "Offer letter sent to customer by SMS and email"} (${offer.number})`,
      { offer: offer.number },
    )
    return offer
  }

  type Draft = Omit<Application, "id" | "reference">
  const drafts: Draft[] = []
  const audit: Omit<AuditEvent, "id">[] = []
  const auditFor: Map<Draft, Omit<AuditEvent, "id">[]> = new Map()

  const log = (
    app: Draft,
    at: number,
    actorId: string | null,
    action: string,
    summary: string,
    metadata: AuditEvent["metadata"] = {},
  ) => {
    const list = auditFor.get(app) ?? []
    list.push({
      at: iso(at),
      actorId: actorId === "system" ? null : actorId,
      actorName: userName(actorId),
      action,
      entity: "application",
      entityId: "",
      entityLabel: "",
      summary,
      metadata,
    })
    auditFor.set(app, list)
  }

  function pickApprover(
    role: Role,
    exclude: Set<string>,
    at: number,
  ): { actorId: string; onBehalfOfId: string | null } {
    if (role === "head_of_credit" && at >= t - DELEGATION_START_DAYS * DAY && !exclude.has(delegation.toUserId)) {
      return { actorId: delegation.toUserId, onBehalfOfId: delegation.fromUserId }
    }
    const candidates = usersByRole(role).filter((u) => !exclude.has(u.id))
    return { actorId: rnd.pick(candidates.length ? candidates : usersByRole(role)).id, onBehalfOfId: null }
  }

  function decisionFor(
    action: DecisionAction,
    stageKey: string,
    role: Role,
    at: number,
    exclude: Set<string>,
  ): Decision {
    const { actorId, onBehalfOfId } = pickApprover(role, exclude, at)
    exclude.add(actorId)
    return {
      // The actor keeps ids unique when several committee members vote at one stage.
      id: `dec-${drafts.length}-${stageKey}-${action}-${actorId}`,
      stageKey,
      action,
      reasonCode: rnd.pick(REASON_FOR[action]),
      comment: rnd.pick(COMMENTS[action]),
      actorId,
      actorRole: role,
      onBehalfOfId,
      automated: false,
      at: iso(at),
    }
  }

  /**
   * Lays out approvals for route[0..upTo) so that stage `upTo` is entered at
   * `enteredAt`. Returns the decisions and the time approval started.
   */
  function history(def: WorkflowDefinition, route: string[], upTo: number, enteredAt: number, maker: string) {
    const durations = route.slice(0, upTo).map((key) => {
      const stage = def.stages.find((s) => s.key === key)!
      return stage.slaHours * HOUR * (0.15 + rnd.next() * 1.05)
    })
    const startedAt = enteredAt - durations.reduce((a, b) => a + b, 0)
    const exclude = new Set([maker])
    const decisions: Decision[] = []
    let cursor = startedAt
    route.slice(0, upTo).forEach((key, i) => {
      cursor += durations[i]
      const stage = def.stages.find((s) => s.key === key)!
      if (stage.committee) {
        // A committee closes once enough members vote approve.
        for (let v = 0; v < stage.committee.votesRequired; v++)
          decisions.push(decisionFor("approve", key, stage.approverRoles[0], cursor - v * HOUR, exclude))
      } else {
        for (const role of stage.quorum === "all" ? stage.approverRoles : [stage.approverRoles[0]]) {
          decisions.push(decisionFor("approve", key, role, cursor, exclude))
        }
      }
    })
    return { decisions, startedAt }
  }

  function person(ethnicity: Ethnicity) {
    const pool = NAME_POOLS[ethnicity]
    const gender = rnd.chance(0.5) ? ("male" as const) : ("female" as const)
    return {
      first: rnd.pick(pool[gender]),
      last: rnd.pick(pool.last),
      middle: rnd.chance(0.4) ? rnd.pick(pool[gender]) : null,
      gender,
    }
  }

  const phone = () => `+234${rnd.pick(PHONE_PREFIXES).slice(1)}${rnd.digits(7)}`
  const bvn = () => `22${rnd.digits(9)}`

  function makeApplicant(
    segment: "retail" | "sme",
    branchId: string,
  ): Pick<Application, "applicant" | "employment" | "business"> {
    const branch = BRANCHES.find((b) => b.id === branchId)!
    const ethnicity = rnd.weighted(ETHNICITY_BY_REGION[branch.regionId] as Record<Ethnicity, number>)
    const p = person(ethnicity)
    if (segment === "retail") {
      const employer = rnd.pick(RETAIL_EMPLOYERS)
      const year = rnd.int(1966, 2001)
      return {
        applicant: {
          kind: "individual",
          firstName: p.first,
          middleName: p.middle,
          lastName: p.last,
          dateOfBirth: `${year}-${String(rnd.int(1, 12)).padStart(2, "0")}-${String(rnd.int(1, 28)).padStart(2, "0")}`,
          gender: p.gender,
          bvn: bvn(),
          nin: rnd.digits(11),
          phone: phone(),
          email: `${p.first}.${p.last}${rnd.int(1, 99)}@gmail.com`.toLowerCase(),
          address: `${rnd.int(1, 120)} ${rnd.pick(STREETS)}`,
          state: branch.state,
        },
        employment: {
          employerName: employer.name,
          sector: employer.sector,
          jobTitle: rnd.pick(JOB_TITLES),
          monthlyNetIncome: rnd.amount(120_000, 2_800_000, 5_000) * N,
          employmentStartDate: `${rnd.int(2008, 2024)}-${String(rnd.int(1, 12)).padStart(2, "0")}-01`,
          salaryBank: rnd.pick(BANKS),
        },
        business: null,
      }
    }
    const revenue = rnd.amount(1_500_000, 60_000_000, 50_000) * N
    return {
      applicant: {
        kind: "business",
        businessName: `${rnd.pick(SME_NAME_PARTS.prefix)} ${rnd.pick(SME_NAME_PARTS.noun)} ${rnd.pick(SME_NAME_PARTS.suffix)}`,
        rcNumber: `RC${rnd.int(150_000, 1_950_000)}`,
        tin: `${rnd.digits(8)}-0001`,
        sector: rnd.pick(SME_SECTORS),
        yearsInOperation: rnd.int(1, 22),
        address: `${rnd.int(1, 120)} ${rnd.pick(STREETS)}`,
        state: branch.state,
        phone: phone(),
        email: `info@${p.last.toLowerCase()}${rnd.int(10, 99)}.com.ng`,
        promoter: { name: `${p.first} ${p.last}`, bvn: bvn(), nin: rnd.digits(11) },
      },
      employment: null,
      business: {
        monthlyRevenue: revenue,
        monthlyExpenses: Math.round(revenue * (0.55 + rnd.next() * 0.3)),
        annualTurnover: revenue * 12,
        primaryBank: rnd.pick(BANKS),
      },
    }
  }

  function scoreFor(status: ApplicationStatus) {
    const base = status === "rejected" ? rnd.int(340, 600) : rnd.int(460, 830)
    const risk = base >= 680 ? ("low" as const) : base >= 560 ? ("medium" as const) : ("high" as const)
    return { score: base, riskRating: risk }
  }

  interface Options {
    status: ApplicationStatus
    segment?: "retail" | "sme"
    productId?: string
    amount?: number
    branchId?: string
    createdById?: string
    /** For in-workflow statuses: which route index is current. */
    stageIndex?: number
    /** Hours the application has sat in its current stage. */
    stageAgeHours?: number
    flags?: ApplicationFlag[]
  }

  function build(o: Options): Draft {
    const segment = o.segment ?? (rnd.chance(0.68) ? "retail" : "sme")
    const product = o.productId
      ? PRODUCTS.find((p) => p.id === o.productId)!
      : rnd.pick(PRODUCTS.filter((p) => p.segment === segment))
    const branchId = o.branchId ?? rnd.pick(BRANCHES).id
    const officerId = BRANCH_OFFICER[branchId]
    const createdById = o.createdById ?? officerId
    const amount =
      o.amount ?? rnd.amount(product.minAmount / N, product.maxAmount / N, segment === "retail" ? 10_000 : 50_000) * N
    const tenorMonths = rnd.int(product.minTenorMonths, product.maxTenorMonths)
    const def = segment === "retail" ? RETAIL_WORKFLOW : SME_WORKFLOW
    const route = resolveRoute(def, amount).stages.map((s) => s.key)
    const agents = AGENTS.filter((a) => a.branchId === branchId)
    const status = o.status

    const inWorkflow = ["pending_approval", "returned", "more_info_requested"].includes(status)
    const approvedish = ["approved", "offer_sent", "offer_accepted", "ready_for_disbursement"].includes(status)
    const rejectedInApproval = status === "rejected" && rnd.chance(0.7)

    let workflow: WorkflowState | null = null
    let createdAt: number
    let submittedAt: number | null
    let updatedAt: number

    const wfBase = {
      definitionId: def.id,
      definitionVersion: def.version,
      route,
      stageApprovals: [],
      stageVotes: [] as WorkflowState["stageVotes"],
    }

    if (inWorkflow) {
      const idx = Math.min(o.stageIndex ?? rnd.int(0, route.length - 1), route.length - 1)
      const stage = def.stages.find((s) => s.key === route[idx])!
      const age = (o.stageAgeHours ?? stage.slaHours * rnd.next() * 1.7) * HOUR
      const enteredAt = t - age
      const { decisions, startedAt } = history(def, route, idx, enteredAt, createdById)
      if (status !== "pending_approval") {
        const action: DecisionAction = status === "returned" ? "return" : "request_info"
        const exclude = new Set([createdById, ...decisions.map((d) => d.actorId)])
        decisions.push(
          decisionFor(action, stage.key, stage.approverRoles[0], enteredAt + age * rnd.next() * 0.6, exclude),
        )
      }
      // Some loans already have a vote in at the committee, so the tally shows progress.
      const stageVotes: WorkflowState["stageVotes"] = []
      if (stage.committee && status === "pending_approval" && rnd.chance(0.6)) {
        const vote = decisionFor(
          "approve",
          stage.key,
          stage.approverRoles[0],
          enteredAt + age * 0.4,
          new Set([createdById, ...decisions.map((d) => d.actorId)]),
        )
        decisions.push(vote)
        stageVotes.push({ userId: vote.actorId, vote: "approve", at: vote.at })
      }
      workflow = { ...wfBase, currentStageKey: stage.key, stageEnteredAt: iso(enteredAt), decisions, stageVotes }
      submittedAt = startedAt - rnd.int(20, 70) * HOUR
      createdAt = submittedAt - rnd.int(1, 30) * HOUR
      updatedAt = decisions.at(-1) ? new Date(decisions.at(-1)!.at).getTime() : enteredAt
    } else if (approvedish || rejectedInApproval) {
      // Offers awaiting the customer are recent; roughly a third have passed their 14-day window.
      const closedAt =
        t -
        rnd.int(
          approvedish && status !== "ready_for_disbursement" ? 6 : 30,
          status === "offer_sent" ? 20 * 24 : 180 * 24,
        ) *
          HOUR
      const upTo = rejectedInApproval ? rnd.int(0, route.length - 1) : route.length
      const { decisions, startedAt } = history(def, route, upTo, closedAt, createdById)
      if (rejectedInApproval) {
        const stage = def.stages.find((s) => s.key === route[upTo])!
        decisions.push(
          decisionFor(
            "reject",
            stage.key,
            stage.approverRoles[0],
            closedAt,
            new Set([createdById, ...decisions.map((d) => d.actorId)]),
          ),
        )
      }
      workflow = {
        ...wfBase,
        currentStageKey: rejectedInApproval ? route[upTo] : null,
        stageEnteredAt: null,
        decisions,
      }
      submittedAt = startedAt - rnd.int(20, 70) * HOUR
      createdAt = submittedAt - rnd.int(1, 30) * HOUR
      updatedAt = closedAt + (approvedish ? rnd.int(1, 5) * HOUR : 0)
    } else {
      const ageDays = status === "rejected" ? rnd.int(5, 120) : rnd.int(0, 12)
      createdAt = t - ageDays * DAY - rnd.int(0, 23) * HOUR
      submittedAt = status === "draft" ? null : createdAt + rnd.int(1, 6) * HOUR
      updatedAt = Math.min(t, (submittedAt ?? createdAt) + rnd.int(1, 48) * HOUR)
    }

    const scored = !["draft", "submitted", "in_verification"].includes(status) && !(status === "rejected" && !workflow)
    const { score, riskRating } = scoreFor(status)
    const flags: ApplicationFlag[] = [...(o.flags ?? [])]
    if (status === "rejected" && !workflow && rnd.chance(0.5)) flags.push("bvn_failed")

    const app: Draft = {
      segment,
      productId: product.id,
      status,
      amountRequested: amount,
      tenorMonths,
      purpose: rnd.pick(LOAN_PURPOSES[segment]),
      ...makeApplicant(segment, branchId),
      // Set in generate.ts once the application has its id.
      accountNumber: "",
      branchId,
      officerId,
      agentId: agents.length && rnd.chance(0.3) ? rnd.pick(agents).id : null,
      createdById,
      createdAt: iso(createdAt),
      submittedAt: submittedAt === null ? null : iso(submittedAt),
      updatedAt: iso(updatedAt),
      riskRating: scored ? riskRating : null,
      score: scored ? score : null,
      workflow,
      flags,
      duplicateOfId: null,
      guarantors: [],
      nextOfKin: null,
      documents: [],
      collateral: [],
      verification: [],
      assessment: null,
      offers: [],
      messages: [],
      offerTerms: null,
      creditHistory: null,
      identity: { selfieUrl: null, bvnPhotoUrl: null, selfieCapturedAt: null, faceMatch: null },
    }

    log(
      app,
      createdAt,
      createdById,
      "application.created",
      `Created ${segment === "retail" ? "retail" : "SME"} application for ${product.name}`,
    )
    if (submittedAt !== null) log(app, submittedAt, createdById, "application.submitted", "Submitted for verification")
    if (workflow) {
      log(
        app,
        submittedAt! + 2 * HOUR,
        rnd.pick(usersByRole("verification_officer")).id,
        "verification.completed",
        "Identity and bureau checks completed",
      )
      for (const d of workflow.decisions) {
        log(
          app,
          new Date(d.at).getTime(),
          d.automated ? "system" : d.actorId,
          `workflow.${d.action}`,
          `${d.action.replace("_", " ")} at ${def.stages.find((s) => s.key === d.stageKey)?.name}`,
          {
            stage: d.stageKey,
            reason: d.reasonCode,
            onBehalfOf: d.onBehalfOfId,
          },
        )
      }
    }
    if (["offer_sent", "offer_accepted", "ready_for_disbursement"].includes(status)) {
      // Some customers lost or let the first link lapse, so the officer re-sent it.
      const resent = offerRnd.chance(0.2)
      if (resent) {
        const first = sendOffer(app, updatedAt - offerRnd.int(15, 20) * DAY, officerId)
        first.status = "superseded"
      }
      const offer = sendOffer(app, updatedAt, officerId, resent)
      if (status !== "offer_sent") {
        offer.status = "accepted"
        offer.respondedAt = iso(updatedAt + 26 * HOUR)
      }
    }
    if (["offer_accepted", "ready_for_disbursement"].includes(status)) {
      const number = app.offers.at(-1)!.number
      log(app, updatedAt + 26 * HOUR, null, "offer.accepted", `Customer accepted offer ${number} electronically`, {
        offer: number,
      })
    }
    if (status === "ready_for_disbursement") {
      log(app, updatedAt + 27 * HOUR, "system", "handover.ready", "Handed over to Finance for disbursement")
    }

    drafts.push(app)
    return app
  }

  // ── Bulk population ────────────────────────────────────────────────
  for (let i = 0; i < count; i++) build({ status: rnd.weighted(STATUS_WEIGHTS) })

  // ── Deliberate edge cases ──────────────────────────────────────────
  // 1. Self-approval: Ngozi (Credit Manager) keyed this in; it now sits at her own stage.
  const self = build({
    status: "pending_approval",
    segment: "retail",
    productId: "p-salary",
    amount: 350_000 * N,
    branchId: "b-lis",
    createdById: "u-cm-1",
    stageIndex: 0,
    stageAgeHours: 5,
    flags: ["self_approval_attempt"],
  })
  log(
    self,
    t - 2 * HOUR,
    "u-cm-1",
    "workflow.blocked",
    "Approval blocked: maker-checker (user created this application)",
    { rule: "maker_checker" },
  )

  // 2. Duplicate applicant: same BVN on two live applications.
  const original = build({
    status: "pending_approval",
    segment: "retail",
    productId: "p-payroll",
    amount: 2_400_000 * N,
    branchId: "b-ikj",
    stageIndex: 0,
    stageAgeHours: 10,
  })
  const duplicate = build({
    status: "in_verification",
    segment: "retail",
    productId: "p-salary",
    amount: 800_000 * N,
    branchId: "b-lek",
    flags: ["duplicate_applicant"],
  })
  if (original.applicant.kind === "individual" && duplicate.applicant.kind === "individual") {
    duplicate.applicant = {
      ...duplicate.applicant,
      firstName: original.applicant.firstName,
      lastName: original.applicant.lastName,
      bvn: original.applicant.bvn,
      dateOfBirth: original.applicant.dateOfBirth,
    }
  }

  // 3. Failed BVN check still in verification.
  build({ status: "in_verification", segment: "retail", branchId: "b-yab", flags: ["bvn_failed"] })
  build({ status: "in_verification", segment: "sme", branchId: "b-kan", flags: ["bvn_failed"] })

  // Committee votes in progress: one approval in, none yet, and a 1–1 split awaiting the deciding vote.
  {
    const castVotes = (app: Draft, votes: [string, "approve" | "decline"][]) => {
      const wf = app.workflow!
      const entered = new Date(wf.stageEnteredAt!).getTime()
      // Replace whatever votes the random build cast, so each example shows exactly these.
      wf.decisions = wf.decisions.filter((d) => d.stageKey !== wf.currentStageKey)
      wf.stageVotes = []
      votes.forEach(([userId, vote], i) => {
        const at = iso(entered + (i + 1) * 3 * HOUR)
        wf.decisions.push({
          id: `dec-${drafts.indexOf(app)}-${wf.currentStageKey}-vote-${userId}`,
          stageKey: wf.currentStageKey!,
          action: vote === "approve" ? "approve" : "reject",
          reasonCode: vote === "approve" ? "meets_policy" : "insufficient_affordability",
          comment:
            vote === "approve"
              ? "Strong cash flow and full collateral cover. I support approval."
              : "Exposure is too concentrated for one obligor. I would cap the amount.",
          actorId: userId,
          actorRole: "final_approver",
          onBehalfOfId: null,
          automated: false,
          at,
        })
        wf.stageVotes.push({ userId, vote, at })
      })
    }
    const retail = build({
      status: "pending_approval",
      segment: "retail",
      productId: "p-payroll",
      amount: 12_500_000 * N,
      branchId: "b-lis",
      stageIndex: 3,
      stageAgeHours: 20,
    })
    castVotes(retail, [["u-fa-2", "approve"]])
    build({
      status: "pending_approval",
      segment: "sme",
      productId: "p-asset-sme",
      amount: 68_000_000 * N,
      branchId: "b-ikj",
      stageIndex: 3,
      stageAgeHours: 6,
    })
    const split = build({
      status: "pending_approval",
      segment: "sme",
      productId: "p-asset-sme",
      amount: 85_000_000 * N,
      branchId: "b-phc",
      stageIndex: 3,
      stageAgeHours: 30,
    })
    castVotes(split, [
      ["u-fa-3", "approve"],
      ["u-fa-2", "decline"],
    ])
  }

  // 4. Hard SLA breaches across stages.
  build({ status: "pending_approval", segment: "retail", branchId: "b-wse", stageIndex: 0, stageAgeHours: 30 })
  build({
    status: "pending_approval",
    segment: "sme",
    amount: 32_000_000 * N,
    branchId: "b-phc",
    stageIndex: 2,
    stageAgeHours: 101,
  })
  build({
    status: "pending_approval",
    segment: "retail",
    amount: 6_500_000 * N,
    productId: "p-payroll",
    branchId: "b-lis",
    stageIndex: 2,
    stageAgeHours: 40,
  })

  // 5. Auto-escalated after a Credit Manager SLA breach (small loans → route extended to Analyst).
  for (const branchId of ["b-ikj", "b-enu", "b-grk"]) {
    // Entered Credit Manager 35h ago; 24h SLA + 8h grace → escalated 3h ago.
    const app = build({
      status: "pending_approval",
      segment: "retail",
      productId: "p-salary",
      amount: rnd.int(15, 45) * 10_000 * N,
      branchId,
      stageIndex: 0,
      stageAgeHours: 35,
    })
    const wf = app.workflow!
    const enteredAt = new Date(wf.stageEnteredAt!).getTime() + 32 * HOUR
    wf.stageEnteredAt = iso(enteredAt)
    wf.decisions.push({
      id: `dec-auto-${branchId}`,
      stageKey: "credit_manager",
      action: "escalate",
      reasonCode: "sla_breach",
      comment: "Automatically escalated to Credit Analyst: the Credit Manager SLA of 24h was breached.",
      actorId: "system",
      actorRole: "credit_manager",
      onBehalfOfId: null,
      automated: true,
      at: iso(enteredAt),
    })
    wf.route = ["credit_manager", "analyst"]
    wf.currentStageKey = "analyst"
    app.flags.push("auto_escalated")
    log(app, enteredAt, "system", "workflow.auto_escalated", "Auto-escalated after Credit Manager SLA breach", {
      stage: "credit_manager",
    })
  }

  // 6. Politically exposed persons on two live applications.
  drafts
    .filter((a) => a.status === "pending_approval")
    .slice(4, 6)
    .forEach((a) => a.flags.push("pep_hit"))

  // ── References, IDs and audit ──────────────────────────────────────
  drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const applications: Application[] = drafts.map((d, i) => {
    const seq = 1040 + i
    return { ...d, id: `app-${seq}`, reference: buildReference(d.segment, new Date(d.createdAt), seq) }
  })
  const idOf = new Map(drafts.map((d, i) => [d, applications[i]]))
  idOf.get(duplicate)!.duplicateOfId = idOf.get(original)!.id

  const offerNumbers = new Map<string, string>()
  applications
    .flatMap((a) => a.offers)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    .forEach((o, i) => {
      const d = new Date(o.sentAt)
      const number = `OFR-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(5, "0")}`
      offerNumbers.set(o.number, number)
      o.number = number
    })
  const withOfferNumber = (text: string) => text.replace(/OFR-PENDING-\d+#/g, (m) => offerNumbers.get(m)!)

  for (const [draft, events] of auditFor) {
    const app = idOf.get(draft)!
    for (const e of events) {
      if (new Date(e.at).getTime() > t) continue
      const metadata =
        typeof e.metadata.offer === "string" ? { ...e.metadata, offer: withOfferNumber(e.metadata.offer) } : e.metadata
      audit.push({ ...e, summary: withOfferNumber(e.summary), metadata, entityId: app.id, entityLabel: app.reference })
    }
  }
  audit.sort((a, b) => b.at.localeCompare(a.at))

  return {
    applications,
    audit: audit.map((e, i) => ({ ...e, id: `aud-${audit.length - i}` })),
    notifications: seedNotifications(applications, delegation, now, rnd),
    delegations: [delegation],
  }
}

function seedNotifications(
  applications: Application[],
  delegation: Delegation,
  now: Date,
  rnd: Random,
): Notification[] {
  const t = now.getTime()
  const out: Omit<Notification, "id">[] = []
  const push = (userId: string, n: Omit<Notification, "id" | "userId" | "readAt">) => {
    const age = t - new Date(n.createdAt).getTime()
    out.push({ ...n, userId, readAt: age > 2 * DAY || rnd.chance(0.35) ? n.createdAt : null })
  }
  const definitions = { retail: RETAIL_WORKFLOW, sme: SME_WORKFLOW }

  for (const app of applications) {
    const wf = app.workflow
    const href = `/applications/${app.id}`
    if (app.status === "pending_approval" && wf?.currentStageKey && wf.stageEnteredAt) {
      const stage = definitions[app.segment].stages.find((s) => s.key === wf.currentStageKey)!
      const recipients = USERS.filter((u) => stage.approverRoles.includes(u.role) && u.id !== app.createdById)
      const sla = computeSla(stage, new Date(wf.stageEnteredAt), now)
      for (const user of recipients) {
        push(user.id, {
          kind: "approval_assigned",
          title: `${app.reference} awaits your decision`,
          body: `${stage.name} stage · SLA ${stage.slaHours}h`,
          href,
          createdAt: wf.stageEnteredAt,
        })
        if (sla.state === "breached") {
          push(user.id, {
            kind: "sla_breached",
            title: `SLA breached on ${app.reference}`,
            body: `${stage.name} SLA of ${stage.slaHours}h has passed.`,
            href,
            createdAt: sla.dueAt.toISOString(),
          })
        }
      }
      if (stage.approverRoles.includes("head_of_credit")) {
        push(delegation.toUserId, {
          kind: "delegation",
          title: `${app.reference} delegated to you`,
          body: "Acting for Olumide Adebayo (Head of Credit).",
          href,
          createdAt: wf.stageEnteredAt,
        })
      }
    }
    if ((app.status === "returned" || app.status === "more_info_requested") && wf) {
      const last = wf.decisions.at(-1)!
      push(app.officerId, {
        kind: app.status === "returned" ? "application_returned" : "info_requested",
        title: `${app.reference} ${app.status === "returned" ? "returned for correction" : "needs more information"}`,
        body: last.comment,
        href,
        createdAt: last.at,
      })
    }
    if (app.status === "ready_for_disbursement") {
      push("u-fin-1", {
        kind: "offer_accepted",
        title: `${app.reference} ready for disbursement`,
        body: "Customer accepted the offer.",
        href: "/handover",
        createdAt: app.updatedAt,
      })
    }
  }

  push(delegation.toUserId, {
    kind: "delegation",
    title: "You are covering for Olumide Adebayo",
    body: "Head of Credit approvals are delegated to you until next week.",
    href: "/my-work?tab=delegated",
    createdAt: delegation.startsAt,
  })

  // Keep the 30 most recent per user so the bell stays realistic.
  const byUser = new Map<string, Omit<Notification, "id">[]>()
  for (const n of out
    .filter((n) => new Date(n.createdAt).getTime() <= t)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const list = byUser.get(n.userId) ?? []
    if (list.length < 30) list.push(n)
    byUser.set(n.userId, list)
  }
  return [...byUser.values()].flat().map((n, i) => ({ ...n, id: `ntf-${i + 1}` }))
}
