import { REQUIRED_DOCUMENTS } from "@/features/applications/schemas/application"
import type { NewApplicationInput } from "@/features/applications/types"
import type { Session } from "@/features/auth/types"
import {
  adjustOfferTerms,
  createApplication,
  decideOnApplication,
  myWork,
  offerView,
  respondToOffer,
  runVerification,
  saveAssessment,
  transitionApplication,
} from "../handlers/actions"
import { dashboardSummary } from "../handlers/dashboard"
import { reportsSummary } from "../handlers/reports"
import { saveWorkflow } from "../handlers/workflows"
import { findAccount } from "../handlers/accounts"
import { updateDraft } from "../handlers/drafts"
import { postMessage, reviewApplication } from "../handlers/messages"
import { DEMO_PIN } from "../handlers/pin"
import { canSeeApplication } from "../handlers/visibility"
import { summariseCreditHistory } from "@/features/applications/utils/credit-history"
import {
  cancelDelegation,
  changePassword,
  changePin,
  createDelegation,
  DEMO_PASSWORD,
  saveNotificationPrefs,
} from "../handlers/settings"
import { changePasswordInputSchema, changePinInputSchema } from "@/features/settings/schemas"
import { DEFAULT_NOTIFICATION_PREFS } from "@/features/settings/constants"
import { getStore, type MockStore } from "../store"

let store: MockStore
beforeAll(async () => {
  store = await getStore()
})

const intake = {
  guarantors: [
    {
      name: "Bola Ade",
      relationship: "Brother",
      phone: "+2348030001111",
      address: "4 Allen Avenue, Ikeja",
      occupation: "Trader",
      monthlyIncome: 30_000_000,
      bvn: null,
    },
  ],
  nextOfKin: { name: "Kemi Ade", relationship: "Spouse", phone: "+2348030002222", address: "4 Allen Avenue, Ikeja" },
  documents: (["id_card", "bank_statement", "payslip", "guarantor_form"] as const).map((type) => ({
    type,
    fileName: `${type}.pdf`,
    sizeBytes: 100_000,
  })),
  collateral: [],
  asDraft: false,
}

const sessionOf = (userId: string): Session => {
  const user = store.users.find((u) => u.id === userId)!
  return { user, permissions: store.rolePermissions[user.role] }
}

/** Opens a current account held by this applicant, as core banking would, and adds its number to the input. */
const withAccount = (input: Omit<NewApplicationInput, "accountNumber">): NewApplicationInput => {
  const accountNumber = `19${String(store.accounts.length).padStart(8, "0")}`
  store.accounts.push({ accountNumber, accountName: "Account holder", openedOn: "2020-01-01", holder: input.applicant })
  return { ...input, accountNumber }
}

const sessionFor = (role: string): Session => {
  const user = store.users.find((u) => u.role === role && u.status !== "inactive")!
  return { user, permissions: store.rolePermissions[user.role] }
}

describe("application lifecycle", () => {
  it("takes a new application from capture to an accepted offer and handover", () => {
    const ro = sessionFor("relationship_officer")
    const product = store.reference.products.find((p) => p.segment === "retail" && p.active)!
    const app = createApplication(
      store,
      ro,
      withAccount({
        segment: "retail",
        productId: product.id,
        amountRequested: product.minAmount,
        tenorMonths: product.minTenorMonths,
        purpose: "School fees",
        branchId: ro.user.branchId,
        agentId: null,
        applicant: {
          kind: "individual",
          firstName: "Test",
          middleName: null,
          lastName: "Customer",
          dateOfBirth: "1990-01-01",
          gender: "female",
          bvn: "99999999999",
          nin: "88888888888",
          phone: "+2348030000000",
          email: "test@example.com",
          address: "1 Test Street",
          state: "Lagos",
        },
        employment: {
          employerName: "Acme",
          sector: "Retail",
          jobTitle: "Clerk",
          monthlyNetIncome: 50_000_000,
          employmentStartDate: "2020-01-01",
          salaryBank: "GTBank",
        },
        business: null,
        ...intake,
      }),
    )
    expect(app.status).toBe("submitted")
    expect(app.reference).toMatch(/^ML-RTL-\d{4}-\d{5}$/)

    const vo = sessionFor("verification_officer")
    const analyst = sessionFor("credit_analyst")
    expect(() => transitionApplication(store, analyst, app.id, "start_verification", DEMO_PIN)).toThrow()
    transitionApplication(store, vo, app.id, "start_verification", DEMO_PIN)
    expect(() => runVerification(store, analyst, app.id, DEMO_PIN)).toThrow(/permission/)
    expect(() => transitionApplication(store, vo, app.id, "complete_verification", DEMO_PIN)).toThrow(
      /Run all verification checks/,
    )
    runVerification(store, vo, app.id, DEMO_PIN)
    expect(app.verification.every((v) => v.status === "passed")).toBe(true)
    transitionApplication(store, vo, app.id, "complete_verification", DEMO_PIN)
    expect(() => transitionApplication(store, ro, app.id, "submit_for_approval", DEMO_PIN)).toThrow(/permission/)
    expect(() => transitionApplication(store, analyst, app.id, "submit_for_approval", DEMO_PIN)).toThrow(/assessment/)
    saveAssessment(
      store,
      analyst,
      app.id,
      {
        monthlyExpenses: 15_000_000,
        existingLoanRepayments: 0,
        recommendation: "approve",
        notes: "Comfortable affordability.",
      },
      DEMO_PIN,
    )
    expect(app.riskRating).not.toBeNull()
    transitionApplication(store, analyst, app.id, "submit_for_approval", DEMO_PIN)
    expect(app.status).toBe("pending_approval")

    // Small loan: closes at Credit Manager. RO can't decide on their own application (maker-checker).
    expect(() =>
      decideOnApplication(
        store,
        ro,
        app.id,
        { action: "approve", reasonCode: "meets_policy", comment: "Looks fine to me overall." },
        DEMO_PIN,
      ),
    ).toThrow()
    const otherRo = store.users.find(
      (u) => u.role === "relationship_officer" && u.id !== ro.user.id && u.status === "active",
    )!
    decideOnApplication(
      store,
      { user: otherRo, permissions: store.rolePermissions.relationship_officer },
      app.id,
      { action: "approve", reasonCode: "meets_policy", comment: "Affordability confirmed from payslip." },
      DEMO_PIN,
    )
    decideOnApplication(
      store,
      sessionFor("credit_manager"),
      app.id,
      { action: "approve", reasonCode: "meets_policy", comment: "Within policy and authority." },
      DEMO_PIN,
    )
    expect(app.status).toBe("approved")

    // Once approved, the application is back with its relationship officer; nobody else may send the offer.
    expect(() => transitionApplication(store, sessionFor("credit_manager"), app.id, "send_offer", DEMO_PIN)).toThrow(
      /with someone else/,
    )
    transitionApplication(store, ro, app.id, "send_offer", DEMO_PIN)
    const { token } = app.offers[0]
    // The link is a random secret, not the application id.
    expect(() => offerView(store, app.id)).toThrow(/not valid/)
    expect(offerView(store, token).monthlyRepayment).toBeGreaterThan(0)
    expect(respondToOffer(store, token, true).status).toBe("offer_accepted")
    expect(() => respondToOffer(store, token, true)).toThrow(/already accepted/)

    transitionApplication(store, sessionFor("finance_officer"), app.id, "mark_ready", DEMO_PIN)
    expect(app.status).toBe("ready_for_disbursement")
    expect(store.audit.filter((e) => e.entityId === app.id).length).toBeGreaterThanOrEqual(9)
  })

  it("flags a duplicate BVN", () => {
    const ro = sessionFor("relationship_officer")
    const existing = store.applications.find(
      (a) => a.applicant.kind === "individual" && a.status === "pending_approval",
    )!
    const product = store.reference.products.find((p) => p.segment === "retail" && p.active)!
    const app = createApplication(
      store,
      ro,
      withAccount({
        segment: "retail",
        productId: product.id,
        amountRequested: product.minAmount,
        tenorMonths: product.minTenorMonths,
        purpose: "Rent",
        branchId: ro.user.branchId,
        agentId: null,
        applicant: { ...(existing.applicant as Extract<typeof existing.applicant, { kind: "individual" }>) },
        employment: existing.employment,
        business: null,
        ...intake,
      }),
    )
    expect(app.flags).toContain("duplicate_applicant")
  })
})

describe("queues and summaries", () => {
  it("only lists approvals the user is allowed to act on", () => {
    const work = myWork(store, sessionFor("credit_manager"))
    expect(work.pending.length + work.delegated.length).toBeGreaterThan(0)
    for (const i of work.overdue) expect(i.sla?.state).toBe("breached")
  })

  it("builds the dashboard", () => {
    const head = sessionFor("head_of_credit")
    const d = dashboardSummary(store, head)
    expect(d.focus).toBe("oversight")
    expect(d.insights!.monthly).toHaveLength(6)
    expect(d.insights!.stages.reduce((t, s) => t + s.count, 0)).toBeGreaterThan(0)
  })

  it("gives management the whole book and everyone else only their own work", () => {
    const audit = reportsSummary(store, sessionFor("auditor"), { range: "all" })
    const head = reportsSummary(store, sessionFor("head_of_credit"), { range: "all" })
    if (audit.kind !== "management" || head.kind !== "management") throw new Error("expected management reports")
    expect(audit.byBranch.length).toBeGreaterThan(0)
    expect(audit.totals.applied.count).toBeGreaterThan(300)
    // Management reports cover the whole book, not just the files a manager worked on.
    expect(head.totals.applied.count).toBe(audit.totals.applied.count)
    expect(audit.funnel.map((f) => f.count)).toEqual([...audit.funnel.map((f) => f.count)].sort((a, b) => b - a))

    // Filters and period narrow it.
    const branchId = store.reference.branches[0].id
    const branch = reportsSummary(store, sessionFor("auditor"), { range: "all", branchId })
    if (branch.kind !== "management") throw new Error("expected a management report")
    expect(branch.totals.applied.count).toBeLessThan(audit.totals.applied.count)
    const month = reportsSummary(store, sessionFor("auditor"), { range: "30d" })
    if (month.kind !== "management") throw new Error("expected a management report")
    expect(month.totals.applied.count).toBeLessThan(audit.totals.applied.count)

    for (const [role, focus] of [
      ["relationship_officer", "origination"],
      ["verification_officer", "verification"],
      ["credit_analyst", "assessment"],
    ] as const) {
      const r = reportsSummary(store, sessionFor(role), { range: "all" })
      expect(r).toMatchObject({ kind: "personal", focus })
      if (r.kind === "personal") expect(r.figures).toHaveLength(4)
    }
    expect(reportsSummary(store, sessionFor("finance_officer"), { range: "all" }).kind).toBe("finance")
  })

  it("gives each team its own dashboard and only its own work", () => {
    const vo = dashboardSummary(store, sessionFor("verification_officer"))
    expect(vo.focus).toBe("verification")
    expect(vo.insights).toBeNull()
    expect(vo.queue!.total).toBeGreaterThan(0)
    for (const i of vo.queue!.items)
      expect(["start_verification", "run_checks", "complete_verification"]).toContain(i.action)
    expect(vo.alerts.some((a) => a.key.startsWith("sla_"))).toBe(false)

    const analyst = dashboardSummary(store, sessionFor("credit_analyst"))
    for (const i of analyst.queue!.items) expect(["assess", "decide"]).toContain(i.action)

    const finance = dashboardSummary(store, sessionFor("finance_officer"))
    for (const i of finance.queue!.items) expect(i.action).toBe("hand_over")

    const auditor = dashboardSummary(store, sessionFor("auditor"))
    expect(auditor.queue).toBeNull()
    expect(auditor.insights).not.toBeNull()

    // Past-SLA work sorts to the top of the queue.
    const cm = dashboardSummary(store, sessionFor("credit_manager"))
    const states = cm.queue!.items.map((i) => i.sla?.state ?? "on_track")
    expect(states).toEqual(
      [...states].sort(
        (a, b) => ["breached", "due_soon", "on_track"].indexOf(a) - ["breached", "due_soon", "on_track"].indexOf(b),
      ),
    )
    for (const d of [vo, analyst, finance, auditor, cm]) expect(d.figures).toHaveLength(4)
  })
})

describe("workflow builder", () => {
  it("publishes a valid edit as a new version", () => {
    const admin = sessionFor("admin")
    const wf = store.workflows.find((w) => w.segment === "retail")!
    const draft = structuredClone(wf)
    draft.stages[1].slaHours = 12
    const published = saveWorkflow(store, admin, draft)
    expect(published.version).toBe(wf.version + 1)
    expect(store.workflows.find((w) => w.id === wf.id)!.stages[1].slaHours).toBe(12)
  })

  it("rejects an invalid or stale definition", () => {
    const admin = sessionFor("admin")
    const wf = store.workflows.find((w) => w.segment === "retail")!
    expect(() => saveWorkflow(store, admin, { ...structuredClone(wf), bands: [] })).toThrow(/band/)
    expect(() => saveWorkflow(store, admin, { ...structuredClone(wf), version: wf.version - 1 })).toThrow(
      /newer version/,
    )
  })

  it("won't remove a stage that applications are still routed through", () => {
    const admin = sessionFor("admin")
    const wf = store.workflows.find((w) => w.segment === "retail")!
    const draft = structuredClone(wf)
    draft.stages = draft.stages.filter((s) => s.key !== "credit_manager")
    draft.bands = draft.bands.map((b) =>
      b.finalStageKey === "credit_manager" ? { ...b, finalStageKey: "ro_review" } : b,
    )
    expect(() => saveWorkflow(store, admin, draft)).toThrow(/still routed through Credit Manager/)
  })
})

describe("intake", () => {
  it("saves an incomplete application as a draft and blocks submitting it until complete", () => {
    const ro = sessionFor("relationship_officer")
    const product = store.reference.products.find((p) => p.segment === "retail" && p.active)!
    const input = withAccount({
      segment: "retail",
      productId: product.id,
      amountRequested: product.minAmount,
      tenorMonths: product.minTenorMonths,
      purpose: "Rent",
      branchId: ro.user.branchId,
      agentId: null,
      applicant: {
        kind: "individual",
        firstName: "Dee",
        middleName: null,
        lastName: "Raft",
        dateOfBirth: "1990-01-01",
        gender: "male",
        bvn: "11122233344",
        nin: "44433322211",
        phone: "+2348030003333",
        email: "dee@example.com",
        address: "9 Draft Road",
        state: "Lagos",
      },
      employment: null,
      business: null,
      guarantors: [],
      nextOfKin: null,
      documents: [],
      collateral: [],
      asDraft: true,
    })
    const draft = createApplication(store, ro, input)
    expect(draft.status).toBe("draft")
    expect(() => transitionApplication(store, ro, draft.id, "submit_draft", DEMO_PIN)).toThrow(/guarantor/)
  })

  it("lets the owning officer finish a draft and submit it, and nobody else", () => {
    const draft = store.applications.find((a) => a.status === "draft")!
    const owner = sessionOf(draft.officerId)
    const otherRo = store.users.find(
      (u) => u.role === "relationship_officer" && u.id !== draft.officerId && u.status === "active",
    )!
    const id = draft.id
    const input: NewApplicationInput = {
      segment: draft.segment,
      productId: draft.productId,
      amountRequested: draft.amountRequested,
      tenorMonths: draft.tenorMonths,
      purpose: draft.purpose,
      branchId: draft.branchId,
      agentId: draft.agentId,
      accountNumber: draft.accountNumber,
      applicant: draft.applicant,
      employment: draft.employment,
      business: draft.business,
      collateral: draft.collateral,
      documents: REQUIRED_DOCUMENTS[draft.segment].map((type) => ({ type, fileName: `${type}.pdf`, sizeBytes: 1 })),
      guarantors: intake.guarantors,
      nextOfKin: intake.nextOfKin,
      asDraft: false,
    }
    const notMine = { user: otherRo, permissions: store.rolePermissions.relationship_officer }
    expect(() => updateDraft(store, notMine, id, input)).toThrow()
    expect(() => updateDraft(store, owner, id, { ...input, guarantors: [] })).toThrow(/guarantor/)
    expect(updateDraft(store, owner, id, { ...input, asDraft: true }).status).toBe("draft")
    const submitted = updateDraft(store, owner, id, input)
    expect(submitted.status).toBe("submitted")
    expect(submitted.submittedAt).not.toBeNull()
    expect(() => updateDraft(store, owner, id, input)).toThrow(/already been submitted/)
  })
})

describe("approval PIN", () => {
  it("rejects a wrong PIN, counts attempts and locks after three", () => {
    const ro = sessionFor("relationship_officer")
    const app = store.applications.find(
      (a) =>
        a.status === "pending_approval" &&
        a.workflow?.currentStageKey === "credit_manager" &&
        a.createdById !== ro.user.id,
    )!
    const cm = store.users.find(
      (u) => u.role === "credit_manager" && !app.workflow!.decisions.some((d) => d.actorId === u.id),
    )!
    const session = { user: cm, permissions: store.rolePermissions.credit_manager }
    const input = { action: "approve" as const, reasonCode: "meets_policy", comment: "Within policy and authority." }
    expect(() => decideOnApplication(store, session, app.id, input, "0000")).toThrow(/2 attempts left/)
    expect(() => decideOnApplication(store, session, app.id, input, "0000")).toThrow(/1 attempt left/)
    expect(() => decideOnApplication(store, session, app.id, input, "0000")).toThrow(/locked/)
    // Even the right PIN is refused while locked.
    expect(() => decideOnApplication(store, session, app.id, input, DEMO_PIN)).toThrow(/locked/)
    expect(app.status).toBe("pending_approval")
    store.pinAttempts.delete(cm.id)
    decideOnApplication(store, session, app.id, input, DEMO_PIN)
    expect(store.audit[0].metadata.pinConfirmed).toBe(true)
  })
})

describe("offers", () => {
  it("gives every seeded offer its own number and link", () => {
    const offers = store.applications.flatMap((a) => a.offers)
    expect(offers.length).toBeGreaterThan(50)
    expect(new Set(offers.map((o) => o.number)).size).toBe(offers.length)
    expect(new Set(offers.map((o) => o.token)).size).toBe(offers.length)
    expect(offers.every((o) => /^[0-9a-f]{48}$/.test(o.token))).toBe(true)
    // At most one live link per application.
    expect(store.applications.every((a) => a.offers.filter((o) => o.status === "sent").length <= 1)).toBe(true)
  })

  it("re-sending issues a new link and retires the old one", () => {
    const app = store.applications.find((a) => a.status === "offer_sent" && a.offers.at(-1)!.status === "sent")!
    const cm = sessionOf(app.officerId)
    const old = app.offers.at(-1)!
    transitionApplication(store, cm, app.id, "resend_offer", DEMO_PIN)
    const fresh = app.offers.at(-1)!
    expect(fresh.number).not.toBe(old.number)
    expect(fresh.token).not.toBe(old.token)
    expect(old.status).toBe("superseded")
    expect(offerView(store, old.token).linkStatus).toBe("superseded")
    expect(() => respondToOffer(store, old.token, true)).toThrow(/replaced/)
    expect(store.audit[0].metadata).toMatchObject({ offer: fresh.number, replaces: old.number, pinConfirmed: true })
    expect(respondToOffer(store, fresh.token, true).linkStatus).toBe("accepted")
  })

  it("won't accept an expired offer", () => {
    const app = store.applications.find(
      (a) => a.status === "offer_sent" && Date.parse(a.offers.at(-1)!.expiresAt) < Date.now(),
    )!
    const { token } = app.offers.at(-1)!
    expect(offerView(store, token).linkStatus).toBe("expired")
    expect(() => respondToOffer(store, token, true)).toThrow(/expired/)
    expect(app.status).toBe("offer_sent")
  })
})

describe("action PIN", () => {
  it("is required for every staff action that changes an application", () => {
    const vo = sessionFor("verification_officer")
    const app = store.applications.find((a) => a.status === "submitted" && a.identity.selfieUrl)!
    expect(() => transitionApplication(store, vo, app.id, "start_verification", "0000")).toThrow(/Incorrect PIN/)
    expect(app.status).toBe("submitted")
    transitionApplication(store, vo, app.id, "start_verification", DEMO_PIN)
    expect(() => runVerification(store, vo, app.id, "0000")).toThrow(/Incorrect PIN/)
    expect(app.verification).toHaveLength(0)
    expect(app.identity.faceMatch).toBeNull()
    runVerification(store, vo, app.id, DEMO_PIN)
    expect(store.audit[0].metadata.pinConfirmed).toBe(true)
    // The BVN check also scores the selfie against the BVN photo.
    expect(app.identity.faceMatch).toBeGreaterThanOrEqual(60)
  })
})

describe("discussion and rejection before approval", () => {
  it("lets staff message each other and notifies the people on the application", () => {
    const analyst = sessionFor("credit_analyst")
    const app = store.applications.find((a) => a.status === "in_assessment")!
    const before = store.notifications.filter((n) => n.userId === app.officerId).length
    postMessage(store, analyst, app.id, { body: "Can you confirm the employer's address?" })
    expect(app.messages.at(-1)).toMatchObject({ authorId: analyst.user.id, kind: "message" })
    expect(store.notifications.filter((n) => n.userId === app.officerId).length).toBe(before + 1)
    expect(
      store.notifications.some(
        (n) => n.userId === analyst.user.id && n.kind === "message" && n.createdAt === app.messages.at(-1)!.at,
      ),
    ).toBe(false)
  })

  it("rejects during verification with a reason, a comment and the PIN", () => {
    const vo = sessionFor("verification_officer")
    const app = store.applications.find((a) => a.status === "in_verification")!
    const input = {
      action: "reject" as const,
      reasonCode: "kyc_failed",
      comment: "ID card photo does not match the BVN record.",
    }
    expect(() => reviewApplication(store, vo, app.id, input, "0000")).toThrow(/Incorrect PIN/)
    expect(() => reviewApplication(store, vo, app.id, { ...input, reasonCode: "meets_policy" }, DEMO_PIN)).toThrow(
      /reason/,
    )
    expect(() => reviewApplication(store, sessionOf(app.officerId), app.id, input, DEMO_PIN)).toThrow(/permission/)
    reviewApplication(store, vo, app.id, input, DEMO_PIN)
    expect(app.status).toBe("rejected")
    expect(app.messages.at(-1)).toMatchObject({ kind: "rejection", reasonCode: "kyc_failed", body: input.comment })
    expect(store.notifications[0]).toMatchObject({ userId: app.officerId, kind: "application_rejected" })
    expect(() => reviewApplication(store, vo, app.id, input, DEMO_PIN)).toThrow(/approval decision/)
  })

  it("returns an application in assessment to the officer", () => {
    const analyst = sessionFor("credit_analyst")
    const app = store.applications.find(
      (a) => a.status === "in_assessment" && a.messages.every((m) => m.kind === "message"),
    )!
    reviewApplication(
      store,
      analyst,
      app.id,
      { action: "return", reasonCode: "incomplete_documents", comment: "Bank statement is missing March and April." },
      DEMO_PIN,
    )
    expect(app.status).toBe("returned")
    expect(app.messages.at(-1)!.kind).toBe("return")
  })
})

describe("who sees what", () => {
  const stageOf = (a: (typeof store.applications)[number]) =>
    a.status === "pending_approval" ? a.workflow?.currentStageKey : null

  it("keeps the final committee away from loans at earlier stages", () => {
    const member = sessionOf("u-fa-2")
    const early = store.applications.filter(
      (a) => stageOf(a) === "credit_manager" && !a.workflow!.decisions.some((d) => d.actorId === "u-fa-2"),
    )
    expect(early.length).toBeGreaterThan(0)
    expect(early.some((a) => canSeeApplication(store, member, a))).toBe(false)
    const atCommittee = store.applications.filter((a) => stageOf(a) === "final" || stageOf(a) === "committee")
    expect(atCommittee.length).toBeGreaterThan(0)
    expect(atCommittee.every((a) => canSeeApplication(store, member, a))).toBe(true)
  })

  it("shows each team its own step, plus anything they already worked on", () => {
    const vo = sessionFor("verification_officer")
    const analyst = sessionFor("credit_analyst")
    const finance = sessionFor("finance_officer")
    for (const a of store.applications) {
      if (a.status === "in_verification") expect(canSeeApplication(store, vo, a)).toBe(true)
      if (a.status === "in_assessment") expect(canSeeApplication(store, analyst, a)).toBe(true)
      if (a.status === "offer_accepted") expect(canSeeApplication(store, finance, a)).toBe(true)
      if (stageOf(a) === "head_of_credit" && !a.messages.some((m) => m.authorId === vo.user.id))
        expect(canSeeApplication(store, vo, a)).toBe(false)
    }
    const decided = store.applications.find(
      (a) => a.status === "approved" && a.workflow?.decisions.some((d) => d.actorId === "u-cm-1"),
    )!
    expect(canSeeApplication(store, sessionOf("u-cm-1"), decided)).toBe(true)
  })

  it("lets relationship officers see only their own files and the ones waiting on their review", () => {
    const ro = sessionFor("relationship_officer")
    for (const a of store.applications) {
      const own = a.officerId === ro.user.id || a.createdById === ro.user.id
      if (
        !own &&
        (a.status === "draft" || a.status === "approved") &&
        !a.workflow?.decisions.some((d) => d.actorId === ro.user.id)
      ) {
        expect(canSeeApplication(store, ro, a)).toBe(false)
      }
    }
  })

  it("keeps the whole book visible to oversight roles", () => {
    for (const role of ["auditor", "admin"]) {
      const session = sessionFor(role)
      expect(store.applications.every((a) => canSeeApplication(store, session, a))).toBe(true)
    }
  })
})

describe("settings", () => {
  it("changes the PIN only with the current one, and rejects easy PINs", () => {
    const user = sessionOf("u-fa-3")
    expect(changePinInputSchema.safeParse({ currentPin: DEMO_PIN, newPin: "1111", confirmPin: "1111" }).success).toBe(
      false,
    )
    expect(changePinInputSchema.safeParse({ currentPin: DEMO_PIN, newPin: "4321", confirmPin: "4321" }).success).toBe(
      false,
    )
    expect(changePinInputSchema.safeParse({ currentPin: DEMO_PIN, newPin: "2580", confirmPin: "2581" }).success).toBe(
      false,
    )
    expect(() => changePin(store, user, { currentPin: "0000", newPin: "2580", confirmPin: "2580" })).toThrow(
      /Incorrect PIN/,
    )
    changePin(store, user, { currentPin: DEMO_PIN, newPin: "2580", confirmPin: "2580" })
    expect(store.audit[0].action).toBe("user.pin_changed")
    // The new PIN is what signs actions from now on.
    expect(() => changePin(store, user, { currentPin: DEMO_PIN, newPin: "1357", confirmPin: "1357" })).toThrow(
      /Incorrect PIN/,
    )
    store.pinAttempts.delete("u-fa-3")
    store.pins.delete("u-fa-3")
  })

  it("delegates to a colleague in the same role, signed with the PIN, without overlaps", () => {
    const cm = sessionOf("u-cm-2")
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
    const input = { toUserId: "u-cm-1", startsAt: day(10), endsAt: day(12), reason: "Annual leave" }
    expect(() => createDelegation(store, cm, { ...input, toUserId: "u-ro-1" }, DEMO_PIN)).toThrow(/same role/)
    expect(() => createDelegation(store, cm, { ...input, endsAt: day(60) }, DEMO_PIN)).toThrow(/at most/)
    expect(() => createDelegation(store, cm, input, "0000")).toThrow(/Incorrect PIN/)
    store.pinAttempts.delete("u-cm-2")
    const d = createDelegation(store, cm, input, DEMO_PIN)
    expect(store.notifications[0]).toMatchObject({ userId: "u-cm-1", kind: "delegation" })
    expect(() => createDelegation(store, cm, { ...input, startsAt: day(11), endsAt: day(13) }, DEMO_PIN)).toThrow(
      /already have/,
    )
    cancelDelegation(store, cm, d.id)
    expect(store.delegations.some((x) => x.id === d.id)).toBe(false)
  })

  it("changes the password only with the current one, and enforces the rules", () => {
    const user = sessionOf("u-an-2")
    const weak = (pw: string) =>
      changePasswordInputSchema.safeParse({ currentPassword: DEMO_PASSWORD, newPassword: pw, confirmPassword: pw })
        .success
    expect(weak("short1!A")).toBe(false)
    expect(weak("alllowercase1!")).toBe(false)
    expect(weak("NoNumbersHere!")).toBe(false)
    expect(weak("NoSymbols12345")).toBe(false)
    expect(weak("Kettle-Harbour-42")).toBe(true)
    expect(() =>
      changePassword(store, user, {
        currentPassword: "wrong",
        newPassword: "Kettle-Harbour-42",
        confirmPassword: "Kettle-Harbour-42",
      }),
    ).toThrow(/incorrect/)
    const first = user.user.name.split(" ")[0]
    expect(() =>
      changePassword(store, user, {
        currentPassword: DEMO_PASSWORD,
        newPassword: `${first}-Harbour-42`,
        confirmPassword: `${first}-Harbour-42`,
      }),
    ).toThrow(/name or email/)
    expect(
      changePassword(store, user, {
        currentPassword: DEMO_PASSWORD,
        newPassword: "Kettle-Harbour-42",
        confirmPassword: "Kettle-Harbour-42",
      }).changedAt,
    ).toBeTruthy()
    expect(() =>
      changePassword(store, user, {
        currentPassword: DEMO_PASSWORD,
        newPassword: "Another-Pass-77",
        confirmPassword: "Another-Pass-77",
      }),
    ).toThrow(/incorrect/)
    store.passwords.delete("u-an-2")
  })

  it("keeps in-app alerts on for events that can't be missed", () => {
    const user = sessionOf("u-cm-1")
    expect(() =>
      saveNotificationPrefs(store, user, { ...DEFAULT_NOTIFICATION_PREFS, sla_breached: ["email"] }),
    ).toThrow(/can't be switched off/)
    expect(saveNotificationPrefs(store, user, { ...DEFAULT_NOTIFICATION_PREFS, message: [] }).message).toEqual([])
  })
})

describe("adjusting the offer", () => {
  it("only lowers the amount, needs the PIN, and re-issues an offer already sent", () => {
    const app = store.applications.find(
      (a) => a.status === "offer_sent" && !a.offerTerms && a.offers.at(-1)!.status === "sent",
    )!
    const officer = sessionOf(app.officerId)
    const product = store.reference.products.find((p) => p.id === app.productId)!
    const lower = Math.max(product.minAmount, Math.round(app.amountRequested * 0.75))
    const reason = "Reduced to keep repayments affordable."
    expect(() =>
      adjustOfferTerms(
        store,
        officer,
        app.id,
        { amount: app.amountRequested + 1, tenorMonths: app.tenorMonths, reason },
        DEMO_PIN,
      ),
    ).toThrow(/more than the customer asked/)
    expect(() =>
      adjustOfferTerms(store, officer, app.id, { amount: lower, tenorMonths: app.tenorMonths, reason }, "0000"),
    ).toThrow(/Incorrect PIN/)
    store.pinAttempts.delete(officer.user.id)
    const old = app.offers.at(-1)!
    adjustOfferTerms(store, officer, app.id, { amount: lower, tenorMonths: app.tenorMonths, reason }, DEMO_PIN)
    expect(app.offerTerms).toMatchObject({ amount: lower, reason })
    expect(old.status).toBe("superseded")
    const view = offerView(store, app.offers.at(-1)!.token)
    expect(view.principal).toBe(lower)
    expect(view.requestedAmount).toBe(app.amountRequested)
    expect(offerView(store, old.token).principal).toBe(app.amountRequested)
    expect(store.audit[0].action).toBe("offer.adjusted")
  })
})

describe("who may change an application", () => {
  it("lets whoever has the application adjust the offer at any step, and nobody else", () => {
    const app = store.applications.find((a) => a.status === "in_verification" && !a.offerTerms)!
    const product = store.reference.products.find((p) => p.id === app.productId)!
    const input = {
      amount: Math.max(product.minAmount, Math.round(app.amountRequested * 0.9)),
      tenorMonths: app.tenorMonths,
      reason: "Reduced after the statement review.",
    }
    // In verification it's with the verification team, not the officer who captured it or an analyst.
    expect(() => adjustOfferTerms(store, sessionOf(app.officerId), app.id, input, DEMO_PIN)).toThrow(
      /with someone else/,
    )
    expect(() => adjustOfferTerms(store, sessionFor("credit_analyst"), app.id, input, DEMO_PIN)).toThrow()
    adjustOfferTerms(store, sessionFor("verification_officer"), app.id, input, DEMO_PIN)
    expect(app.offerTerms).toMatchObject({ amount: input.amount })
  })

  it("stops anyone else's relationship officer changing a returned application", () => {
    const app = store.applications.find((a) => a.status === "returned")!
    const otherRo = store.users.find(
      (u) => u.role === "relationship_officer" && u.id !== app.officerId && u.status === "active",
    )!
    const session = { user: otherRo, permissions: store.rolePermissions.relationship_officer }
    expect(() => transitionApplication(store, session, app.id, "resubmit", DEMO_PIN)).toThrow()
  })
})

describe("current account", () => {
  it("finds an account by number and fills nothing for an unknown one", () => {
    const ro = sessionFor("relationship_officer")
    const account = store.accounts[0]
    expect(findAccount(store, ro, account.accountNumber).holder).toEqual(account.holder)
    expect(() => findAccount(store, ro, "0000000000")).toThrow(/No current account/)
    expect(() => findAccount(store, sessionFor("finance_officer"), account.accountNumber)).toThrow(/permission/)
  })

  it("won't create an application whose applicant isn't the account holder", () => {
    const ro = sessionFor("relationship_officer")
    const personal = store.accounts.find((a) => a.holder.kind === "individual")!
    const business = store.accounts.find((a) => a.holder.kind === "business")!
    const product = store.reference.products.find((p) => p.segment === "retail" && p.active)!
    const input = withAccount({
      segment: "retail",
      productId: product.id,
      amountRequested: product.minAmount,
      tenorMonths: product.minTenorMonths,
      purpose: "Rent renewal",
      branchId: ro.user.branchId,
      agentId: null,
      applicant: {
        ...(personal.holder as Extract<typeof personal.holder, { kind: "individual" }>),
        bvn: "22000000000",
      },
      employment: null,
      business: null,
      ...intake,
      asDraft: true,
    })
    expect(() => createApplication(store, ro, { ...input, accountNumber: personal.accountNumber })).toThrow(
      /doesn't match/,
    )
    expect(() => createApplication(store, ro, { ...input, accountNumber: business.accountNumber })).toThrow(
      /personal account/,
    )
    expect(() => createApplication(store, ro, { ...input, accountNumber: "1999999999" })).toThrow(/No current account/)
  })
})

describe("credit history", () => {
  it("matches the assessment, and bureau checks agree with any arrears", () => {
    const withReport = store.applications.filter((a) => a.creditHistory && a.assessment)
    expect(withReport.length).toBeGreaterThan(100)
    for (const a of withReport) {
      // Active loans add up to what the analyst recorded as other repayments.
      expect(summariseCreditHistory(a.creditHistory!).monthly).toBe(a.assessment!.existingLoanRepayments)
      const arrears = a.creditHistory!.facilities.some((f) => f.daysPastDue > 0)
      const flagged = a.verification.some((v) => v.kind.startsWith("bureau_") && v.status === "review")
      expect(flagged).toBe(arrears)
    }
    // High-risk files always show why.
    expect(
      withReport
        .filter((a) => a.riskRating === "high")
        .every((a) => a.creditHistory!.facilities.some((f) => f.daysPastDue > 0)),
    ).toBe(true)
  })

  it("is pulled when the bureau checks run", () => {
    const vo = sessionFor("verification_officer")
    const app = store.applications.find(
      (a) =>
        a.status === "in_verification" && !a.creditHistory && !a.verification.some((v) => v.kind.startsWith("bureau_")),
    )!
    runVerification(store, vo, app.id, DEMO_PIN)
    expect(app.creditHistory).not.toBeNull()
    expect(app.creditHistory!.facilities.length).toBeGreaterThan(0)
  })
})
