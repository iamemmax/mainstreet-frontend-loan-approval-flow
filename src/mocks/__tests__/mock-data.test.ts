import { computeSla, getStage, validateWorkflow } from "@/features/workflow/engine"
import { applicationListParamsSchema } from "@/features/applications/schemas/application"
import { listApplications } from "../handlers/applications"
import { myPerformance } from "../handlers/reports"
import { getStore, type MockStore } from "../store"

let store: MockStore
beforeAll(async () => {
  store = await getStore()
})

const sessionFor = (id: string) => {
  const user = store.users.find((u) => u.id === id)!
  return { user, permissions: store.rolePermissions[user.role] }
}

describe("mock JSON", () => {
  it("parses against the shared Zod schemas", () => {
    expect(store.applications.length).toBeGreaterThan(300)
    expect(store.audit.length).toBeGreaterThan(1000)
  })

  it("covers every lifecycle status", () => {
    const statuses = new Set(store.applications.map((a) => a.status))
    expect(statuses.size).toBe(12)
  })

  it("has unique references", () => {
    expect(new Set(store.applications.map((a) => a.reference)).size).toBe(store.applications.length)
  })

  it("ships valid workflow definitions", () => {
    for (const wf of store.workflows) expect(validateWorkflow(wf)).toEqual({ valid: true, issues: [] })
  })

  it("never records a decision by the application's maker", () => {
    for (const app of store.applications) {
      for (const d of app.workflow?.decisions ?? []) expect(d.actorId).not.toBe(app.createdById)
    }
  })

  it("keeps pending applications on a stage of their route", () => {
    for (const app of store.applications.filter((a) => a.status === "pending_approval")) {
      expect(app.workflow?.route).toContain(app.workflow?.currentStageKey)
      expect(app.workflow?.stageEnteredAt).not.toBeNull()
    }
  })

  it("has a realistic SLA mix after shifting dates to now", () => {
    const now = new Date()
    const states = store.applications
      .filter((a) => a.status === "pending_approval")
      .map((a) => {
        const def = store.workflows.find((w) => w.id === a.workflow!.definitionId)!
        return computeSla(getStage(def, a.workflow!.currentStageKey!), new Date(a.workflow!.stageEnteredAt!), now).state
      })
    expect(states).toEqual(expect.arrayContaining(["on_track", "due_soon", "breached"]))
  })

  it("includes the documented edge cases", () => {
    const flags = store.applications.flatMap((a) => a.flags)
    for (const f of ["duplicate_applicant", "bvn_failed", "pep_hit", "self_approval_attempt", "auto_escalated"])
      expect(flags).toContain(f)
    const dup = store.applications.find((a) => a.flags.includes("duplicate_applicant"))!
    expect(store.applications.find((a) => a.id === dup.duplicateOfId)).toBeDefined()
    expect(store.delegations).toHaveLength(1)
  })
})

describe("applications handler", () => {
  const params = (p: Record<string, unknown>) => applicationListParamsSchema.parse(p)

  it("filters, sorts and paginates", () => {
    const res = listApplications(
      store,
      sessionFor("u-hoc-1"),
      params({ status: ["pending_approval"], sort: "amountRequested", dir: "desc", pageSize: 10 }),
    )
    expect(res.items).toHaveLength(10)
    expect(res.items.every((i) => i.status === "pending_approval")).toBe(true)
    const amounts = res.items.map((i) => i.amountRequested)
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
  })

  it("limits officers without view-all to their own work and their approval stage", () => {
    const ro = sessionFor("u-ro-1")
    const res = listApplications(store, ro, params({ pageSize: 100 }))
    expect(res.total).toBeGreaterThan(0)
    expect(res.total).toBeLessThan(store.applications.length)
    for (const i of res.items) {
      const app = store.applications.find((a) => a.id === i.id)!
      const own = app.officerId === "u-ro-1" || app.createdById === "u-ro-1"
      const decided = app.workflow?.decisions.some((d) => d.actorId === "u-ro-1")
      expect(own || decided || i.currentStageKey === "ro_review").toBe(true)
    }
  })

  it("searches by reference", () => {
    const ref = store.applications[10].reference
    const res = listApplications(store, sessionFor("u-adm-1"), params({ q: ref }))
    expect(res.items.map((i) => i.reference)).toEqual([ref])
  })
})

describe("my performance", () => {
  const firstOf = (role: string) => store.users.find((u) => u.role === role)!.id

  it("gives relationship and verification officers their own figures", () => {
    expect(myPerformance(store, sessionFor(firstOf("relationship_officer"))).focus).toBe("origination")
    expect(myPerformance(store, sessionFor(firstOf("verification_officer"))).focus).toBe("verification")
  })

  it("refuses roles that have a Reports page", () => {
    expect(() => myPerformance(store, sessionFor(firstOf("credit_manager")))).toThrow("permission")
  })
})
