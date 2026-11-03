import { ASSESSABLE_STATUSES } from "@/features/applications/schemas/status"
import { DOCUMENT_TYPE_LABELS, REQUIRED_DOCUMENTS } from "@/features/applications/schemas/application"
import type {
  AdjustOfferInput,
  Application,
  ApplicationTransition,
  Assessment,
  NewApplicationInput,
  VerificationResult,
} from "@/features/applications/types"
import { requiredChecks } from "@/features/applications/utils/checks"
import { applicantBvn } from "@/features/applications/utils/applicant"
import { isOnDesk } from "@/features/applications/utils/desk"
import { currentOffer, isOfferExpired, offeredTerms } from "@/features/applications/utils/offer"
import { formatNaira } from "@/lib/format/money"
import { scoreApplication } from "@/features/applications/utils/scorecard"
import type { Session } from "@/features/auth/types"
import {
  applyDecision,
  assertTransition,
  canAct,
  resubmit,
  startApproval,
  type EngineDelegation,
} from "@/features/workflow/engine"
import type { DecisionInput } from "@/features/workflow/types"
import { ApiError } from "@/lib/api/errors"
import type { Permission } from "@/lib/rbac/permissions"
import type { MockStore } from "../store"
import { applicantName, getApplication, toListItem, visibleApplications } from "./applications"
import { adjustOffer, issueOffer, offerView as viewOffer, respondToOffer as answerOffer } from "./offers"
import { buildCreditHistory, bureauFindings, seededRng } from "../credit-history"
import { verifyApprovalPin } from "./pin"
import { assertAccountMatches } from "./accounts"

export type AssessmentInput = Omit<Assessment, "updatedAt" | "updatedById">

export function audit(
  store: MockStore,
  session: Session | null,
  app: Application,
  action: string,
  summary: string,
  metadata: Record<string, string | boolean | null> = {},
) {
  store.audit.unshift({
    id: `aud-${store.audit.length + 1}`,
    at: new Date().toISOString(),
    actorId: session?.user.id ?? null,
    actorName: session?.user.name ?? applicantName(app),
    action,
    entity: "application",
    entityId: app.id,
    entityLabel: app.reference,
    summary,
    metadata,
  })
}

export function requirePermission(session: Session, permission: Permission) {
  if (!session.permissions.includes(permission))
    throw new ApiError(403, "forbidden", "You do not have permission to do this")
}

/** Only the person the application is with right now may change it (see `isOnDesk`). */
export function requireOnDesk(store: MockStore, session: Session, app: Application, now: Date) {
  if (!isOnDesk(app, session.user, canDecideNow(store, session, app, now))) {
    throw new ApiError(403, "not_on_your_desk", "This application is with someone else at this step")
  }
}

/** Whether the workflow engine lets this user decide at the application's current approval stage. */
function canDecideNow(store: MockStore, session: Session, app: Application, now: Date): boolean {
  if (app.status !== "pending_approval") return false
  const definition = store.workflows.find((w) => w.id === app.workflow?.definitionId)
  if (!definition) return false
  const actor = { id: session.user.id, role: session.user.role }
  const delegations = receivedDelegations(store, session, now)
  return canAct({ application: app, definition, actor, delegations, now }).allowed
}

export function receivedDelegations(store: MockStore, session: Session, now: Date): EngineDelegation[] {
  return store.delegations
    .filter((d) => d.toUserId === session.user.id)
    .flatMap((d) => {
      const from = store.users.find((u) => u.id === d.fromUserId)
      return from
        ? [
            {
              fromUserId: from.id,
              fromUserName: from.name,
              fromRole: from.role,
              startsAt: d.startsAt,
              endsAt: d.endsAt,
            },
          ]
        : []
    })
    .filter((d) => new Date(d.startsAt) <= now && now <= new Date(d.endsAt))
}

/** Every approval decision is signed with the approver's PIN. */
export function decideOnApplication(store: MockStore, session: Session, id: string, input: DecisionInput, pin: string) {
  const now = new Date()
  const app = getApplication(store, session, id)
  verifyApprovalPin(store, session.user.id, pin, now.getTime())
  const definition = store.workflows.find((w) => w.id === app.workflow?.definitionId)
  if (!definition) throw new ApiError(409, "no_workflow", "This application is not in an approval workflow")

  const result = applyDecision({
    application: app,
    definition,
    actor: { id: session.user.id, role: session.user.role },
    delegations: receivedDelegations(store, session, now),
    input,
    decisionId: `dec-${app.id}-${Date.now()}`,
    now,
  })
  app.status = result.status
  app.workflow = result.workflow
  app.updatedAt = now.toISOString()
  audit(
    store,
    session,
    app,
    `workflow.${input.action}`,
    `${input.action.replace("_", " ")} at ${definition.stages.find((s) => s.key === result.decision?.stageKey)?.name}`,
    {
      stage: result.decision?.stageKey ?? null,
      reason: input.reasonCode,
      onBehalfOf: result.decision?.onBehalfOfId ?? null,
      pinConfirmed: true,
    },
  )
  return app
}

const TRANSITION_RULES: Record<ApplicationTransition, { permission: Permission; summary: string }> = {
  submit_draft: { permission: "application:edit", summary: "Draft submitted for verification" },
  start_verification: { permission: "verification:run", summary: "Verification started" },
  complete_verification: { permission: "verification:run", summary: "Verification completed" },
  submit_for_approval: { permission: "assessment:edit", summary: "Submitted for approval" },
  resubmit: { permission: "application:edit", summary: "Resubmitted after correction" },
  send_offer: { permission: "offer:send", summary: "Offer sent to customer" },
  resend_offer: { permission: "offer:send", summary: "Offer re-issued; the previous link no longer works" },
  mark_ready: { permission: "handover:view", summary: "Handed over to finance for disbursement" },
}

/** Every staff action that changes an application is confirmed with the actor's PIN. */
export function transitionApplication(
  store: MockStore,
  session: Session,
  id: string,
  transition: ApplicationTransition,
  pin: string,
) {
  const now = new Date()
  const app = getApplication(store, session, id)
  const rule = TRANSITION_RULES[transition]
  requirePermission(session, rule.permission)
  requireOnDesk(store, session, app, now)
  verifyApprovalPin(store, session.user.id, pin, now.getTime())
  const metadata: Record<string, string | boolean | null> = { pinConfirmed: true }

  switch (transition) {
    case "submit_draft": {
      const missing = intakeGaps(app)
      if (missing.length) throw new ApiError(422, "incomplete", `Complete the application first: ${missing.join(", ")}`)
      assertTransition(app.status, "submitted")
      app.status = "submitted"
      app.submittedAt = now.toISOString()
      break
    }
    case "start_verification":
      assertTransition(app.status, "in_verification")
      app.status = "in_verification"
      break
    case "complete_verification": {
      const done = new Set(app.verification.map((v) => v.kind))
      const outstanding = requiredChecks(app).filter((k) => !done.has(k))
      if (outstanding.length)
        throw new ApiError(422, "checks_outstanding", "Run all verification checks before completing verification")
      if (
        app.verification.some((v) => v.status === "failed") &&
        !session.permissions.includes("verification:override")
      ) {
        throw new ApiError(
          422,
          "checks_failed",
          "A check failed. Return the application or ask a supervisor to override.",
        )
      }
      assertTransition(app.status, "in_assessment")
      app.status = "in_assessment"
      break
    }
    case "submit_for_approval": {
      if (!app.assessment)
        throw new ApiError(422, "not_assessed", "Save the credit assessment before submitting for approval")
      const definition = store.workflows.find((w) => w.segment === app.segment)
      if (!definition) throw new ApiError(409, "no_workflow", `No workflow is configured for ${app.segment}`)
      assertTransition(app.status, "pending_approval")
      app.status = "pending_approval"
      app.workflow = startApproval(definition, app.amountRequested, now)
      break
    }
    case "resubmit":
      resubmitApplication(app, now)
      break
    case "send_offer":
      assertTransition(app.status, "offer_sent")
      app.status = "offer_sent"
      metadata.offer = issueOffer(store, session, app, now).number
      break
    case "resend_offer": {
      if (app.status !== "offer_sent")
        throw new ApiError(409, "no_open_offer", "Only an offer awaiting the customer can be re-sent")
      const previous = currentOffer(app)
      metadata.offer = issueOffer(store, session, app, now).number
      metadata.replaces = previous?.number ?? null
      metadata.previousExpired = previous ? isOfferExpired(previous, now.getTime()) : null
      break
    }
    case "mark_ready":
      assertTransition(app.status, "ready_for_disbursement")
      app.status = "ready_for_disbursement"
      break
  }
  app.updatedAt = now.toISOString()
  const summary = metadata.offer ? `${rule.summary} (${metadata.offer})` : rule.summary
  audit(store, session, app, `application.${transition}`, summary, metadata)
  return app
}

export function createApplication(store: MockStore, session: Session, input: NewApplicationInput) {
  requirePermission(session, "application:create")
  assertAccountMatches(store, input)
  const app = insertApplication(
    store,
    input,
    { officerId: session.user.id, createdById: session.user.id },
    session.user.id,
  )
  audit(
    store,
    session,
    app,
    "application.created",
    input.asDraft ? "Application saved as draft" : "Application captured and submitted",
  )
  return app
}

/** What still needs capturing before a draft can be submitted. */
export function intakeGaps(app: Application): string[] {
  const gaps: string[] = []
  const have = new Set(app.documents.map((d) => d.type))
  const docs = REQUIRED_DOCUMENTS[app.segment].filter((t) => !have.has(t))
  if (docs.length) gaps.push(`documents (${docs.map((d) => DOCUMENT_TYPE_LABELS[d]).join(", ")})`)
  if (!app.guarantors.length) gaps.push("a guarantor")
  if (!app.nextOfKin) gaps.push("next of kin")
  return gaps
}

const PROVIDER: Record<VerificationResult["kind"], string> = {
  bvn: "Prembly",
  nin: "Prembly",
  phone: "Prembly",
  cac: "Prembly",
  employer: "Employer confirmation",
  bank_statement: "Statement analysis",
  bureau_crc: "CRC Credit Bureau",
  bureau_firstcentral: "FirstCentral",
  bureau_creditregistry: "CreditRegistry",
  pep_sanctions: "Screening",
  blacklist: "Internal",
}

/** The simulated provider's answer: the seeded flags decide which checks fail or need review. */
function simulatedResult(
  app: Application,
  kind: VerificationResult["kind"],
): Pick<VerificationResult, "status" | "detail"> {
  if (kind === "bvn" && app.flags.includes("bvn_failed")) {
    return { status: "failed", detail: "Name and date of birth do not match the BVN record" }
  }
  if (kind === "pep_sanctions" && app.flags.includes("pep_hit")) {
    return { status: "review", detail: "Possible match on the PEP list — enhanced due diligence required" }
  }
  return { status: "passed", detail: CHECK_PASSED[kind] }
}

/** Runs every outstanding KYC, bureau and screening check (simulated providers). */
export function runVerification(store: MockStore, session: Session, id: string, pin: string) {
  requirePermission(session, "verification:run")
  const app = getApplication(store, session, id)
  verifyApprovalPin(store, session.user.id, pin)
  if (app.status !== "in_verification") throw new ApiError(409, "not_in_verification", "Start verification first")
  requireOnDesk(store, session, app, new Date())
  const now = Date.now()
  const done = new Set(app.verification.map((v) => v.kind))
  requiredChecks(app)
    .filter((k) => !done.has(k))
    .forEach((kind, i) => {
      const at = new Date(now + i * 1000).toISOString()
      app.verification.push({ kind, ...simulatedResult(app, kind), provider: PROVIDER[kind], at })
    })
  // The bureau checks bring back the borrower's credit report.
  if (!app.creditHistory && app.verification.some((v) => v.kind.startsWith("bureau_"))) {
    app.creditHistory = buildCreditHistory(app, seededRng(app.id), new Date(now))
    app.verification = bureauFindings(app.creditHistory, app.verification)
  }
  // The BVN check also compares the selfie with the BVN photo.
  if (app.identity.selfieUrl && app.identity.faceMatch === null && app.verification.some((v) => v.kind === "bvn")) {
    app.identity.faceMatch = app.flags.includes("bvn_failed") ? 31 : 93
  }
  app.updatedAt = new Date(now).toISOString()
  audit(store, session, app, "verification.checks_run", "Identity, bureau and screening checks run", {
    pinConfirmed: true,
  })
  return app
}

const CHECK_PASSED: Record<VerificationResult["kind"], string> = {
  bvn: "Name, date of birth and photo match the BVN record",
  nin: "NIN is valid and matches the applicant",
  phone: "Phone number is registered to the applicant",
  cac: "Company is active on the CAC register; directors match",
  employer: "Employment and salary confirmed with HR",
  bank_statement: "Regular inflows consistent with declared income",
  bureau_crc: "No delinquent facilities",
  bureau_firstcentral: "No delinquent facilities",
  bureau_creditregistry: "No delinquent facilities",
  pep_sanctions: "No PEP, sanctions or adverse media matches",
  blacklist: "Not on the Bank's internal blacklist",
}

/** Saves the analyst's affordability inputs, notes and recommendation, and re-scores the application. */
export function saveAssessment(store: MockStore, session: Session, id: string, input: AssessmentInput, pin: string) {
  requirePermission(session, "assessment:edit")
  const app = getApplication(store, session, id)
  if (!ASSESSABLE_STATUSES.includes(app.status)) {
    throw new ApiError(409, "not_assessable", "The assessment can only change before final approval")
  }
  requireOnDesk(store, session, app, new Date())
  verifyApprovalPin(store, session.user.id, pin)
  const product = store.reference.products.find((p) => p.id === app.productId)!
  app.assessment = { ...input, updatedAt: new Date().toISOString(), updatedById: session.user.id }
  const result = scoreApplication(app, product)
  app.score = result.score
  app.riskRating = result.riskRating
  app.updatedAt = app.assessment.updatedAt
  audit(
    store,
    session,
    app,
    "assessment.saved",
    `Assessment saved: ${result.riskRating} risk (${result.score}), analyst recommends ${input.recommendation ?? "—"}`,
    { pinConfirmed: true },
  )
  return app
}

/** The amount and tenor must fit an active product. */
export function assertWithinProduct(store: MockStore, input: NewApplicationInput) {
  const product = store.reference.products.find((p) => p.id === input.productId && p.active)
  if (!product) throw new ApiError(422, "invalid_product", "Choose an active product")
  if (input.amountRequested < product.minAmount || input.amountRequested > product.maxAmount) {
    throw new ApiError(
      422,
      "amount_out_of_range",
      `${product.name} lends between the product's minimum and maximum amounts`,
    )
  }
  if (input.tenorMonths < product.minTenorMonths || input.tenorMonths > product.maxTenorMonths) {
    throw new ApiError(
      422,
      "tenor_out_of_range",
      `${product.name} runs for ${product.minTenorMonths}–${product.maxTenorMonths} months`,
    )
  }
}

/** Flags the application if another live application uses the same BVN. */
export function flagDuplicate(store: MockStore, app: Application) {
  const bvn = applicantBvn(app.applicant)
  const duplicate = store.applications.find(
    (a) =>
      a.id !== app.id &&
      applicantBvn(a.applicant) === bvn &&
      a.status !== "rejected" &&
      a.status !== "ready_for_disbursement",
  )
  app.flags = app.flags.filter((flag) => flag !== "duplicate_applicant")
  app.duplicateOfId = duplicate?.id ?? null
  if (duplicate) app.flags.push("duplicate_applicant")
}

/** Validates against the product, assigns a reference and flags duplicate BVNs. */
export function insertApplication(
  store: MockStore,
  input: NewApplicationInput,
  owner: { officerId: string; createdById: string },
  uploadedById: string,
) {
  assertWithinProduct(store, input)
  const now = new Date()
  const next = Math.max(...store.applications.map((a) => Number(a.id.replace(/\D/g, "")) || 0)) + 1
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`
  const { asDraft, documents, ...rest } = input
  const app: Application = {
    ...rest,
    id: `app-${next}`,
    reference: `ML-${input.segment === "sme" ? "SME" : "RTL"}-${yymm}-${String(next).padStart(5, "0")}`,
    status: asDraft ? "draft" : "submitted",
    ...owner,
    createdAt: now.toISOString(),
    submittedAt: asDraft ? null : now.toISOString(),
    updatedAt: now.toISOString(),
    riskRating: null,
    score: null,
    workflow: null,
    flags: [],
    duplicateOfId: null,
    // The mock keeps no file bytes, so new uploads have no link to open.
    documents: documents.map((d, i) => ({
      ...d,
      id: `app-${next}-doc-${i + 1}`,
      uploadedAt: now.toISOString(),
      uploadedById,
      url: null,
    })),
    verification: [],
    assessment: null,
    offers: [],
    messages: [],
    offerTerms: null,
    creditHistory: null,
    // A real intake captures the selfie on the customer's phone; the mock has none.
    identity: { selfieUrl: null, bvnPhotoUrl: null, selfieCapturedAt: null, faceMatch: null },
  }
  if (!asDraft) {
    const missing = intakeGaps(app)
    if (missing.length) throw new ApiError(422, "incomplete", `Complete the application first: ${missing.join(", ")}`)
  }
  flagDuplicate(store, app)
  store.applications.unshift(app)
  return app
}

/** Sends a returned application back to where it came from. */
export function resubmitApplication(app: Application, now: Date) {
  if (app.workflow?.currentStageKey) {
    const result = resubmit(app, now)
    app.status = result.status
    app.workflow = result.workflow
  } else {
    assertTransition(app.status, "submitted")
    app.status = "submitted"
  }
}

/** The approval queues for the signed-in approver. */
export function myWork(store: MockStore, session: Session) {
  const now = new Date()
  const delegations = receivedDelegations(store, session, now)
  const pending = []
  const delegated = []
  for (const app of visibleApplications(store, session)) {
    if (app.status !== "pending_approval") continue
    const definition = store.workflows.find((w) => w.id === app.workflow?.definitionId)
    if (!definition) continue
    const evaluation = canAct({
      application: app,
      definition,
      actor: { id: session.user.id, role: session.user.role },
      delegations,
      now,
    })
    if (!evaluation.allowed) continue
    const item = toListItem(store, app, now)
    if (evaluation.onBehalfOf) delegated.push({ ...item, onBehalfOfName: evaluation.onBehalfOf.name })
    else pending.push({ ...item, onBehalfOfName: null })
  }
  const returned = visibleApplications(store, session)
    .filter((a) => a.officerId === session.user.id && (a.status === "returned" || a.status === "more_info_requested"))
    .map((a) => ({ ...toListItem(store, a, now), onBehalfOfName: null }))
  const bySla = (a: { sla: { dueAt: string } | null }, b: { sla: { dueAt: string } | null }) =>
    (a.sla?.dueAt ?? "9").localeCompare(b.sla?.dueAt ?? "9")
  pending.sort(bySla)
  delegated.sort(bySla)
  return {
    pending,
    delegated,
    returned,
    overdue: [...pending, ...delegated].filter((i) => i.sla?.state === "breached").sort(bySla),
  }
}

export function offerView(store: MockStore, token: string) {
  return viewOffer(store, token)
}

export function respondToOffer(store: MockStore, token: string, accept: boolean) {
  return answerOffer(store, token, accept, (app, action, summary, metadata) =>
    audit(store, null, app, action, summary, metadata),
  )
}

/**
 * Changes what the bank offers (amount down, or tenor), with a reason and the PIN.
 * Any step may do it, but only the person the application is with right now.
 */
export function adjustOfferTerms(store: MockStore, session: Session, id: string, input: AdjustOfferInput, pin: string) {
  const app = getApplication(store, session, id)
  const now = new Date()
  requireOnDesk(store, session, app, now)
  verifyApprovalPin(store, session.user.id, pin, now.getTime())
  const before = offeredTerms(app)
  const reissued = adjustOffer(store, session, app, input, now)
  app.updatedAt = now.toISOString()
  audit(
    store,
    session,
    app,
    "offer.adjusted",
    `Offer changed from ${formatNaira(before.amount)} over ${before.tenorMonths} months to ${formatNaira(input.amount)} over ${input.tenorMonths} months: ${input.reason}`,
    { offer: reissued?.number ?? null, pinConfirmed: true },
  )
  return app
}
