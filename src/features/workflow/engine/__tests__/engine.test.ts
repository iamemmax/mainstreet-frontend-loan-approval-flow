import {
  applyDecision,
  authorityLimitForStage,
  autoEscalate,
  canAct,
  canTransition,
  computeSla,
  resolveRoute,
  resubmit,
  simulateRoute,
  startApproval,
  validateWorkflow,
  WorkflowEngineError,
  type EngineActor,
  type EngineApplication,
} from ".."
import type { DecisionInput } from "../../types"
import { hoursBefore, naira, NOW, pendingAt, retailWorkflow } from "./fixtures"

const cm: EngineActor = { id: "u-cm", role: "credit_manager" }
const ro: EngineActor = { id: "u-ro", role: "relationship_officer" }
const approve: DecisionInput = {
  action: "approve",
  reasonCode: "meets_policy",
  comment: "Affordability and bureau are clean.",
}

function decide(
  application: EngineApplication,
  actor: EngineActor,
  input: DecisionInput = approve,
  def = retailWorkflow(),
) {
  return applyDecision({ application, definition: def, actor, delegations: [], input, decisionId: "d1", now: NOW })
}

describe("routing by approval limits", () => {
  const def = retailWorkflow()

  it("closes small loans at the credit manager", () => {
    expect(resolveRoute(def, naira(200_000)).stages.map((s) => s.key)).toEqual(["ro", "cm"])
  })

  it("treats band edges as inclusive upper limits", () => {
    expect(resolveRoute(def, naira(500_000)).finalStage.key).toBe("cm")
    expect(resolveRoute(def, naira(500_000) + 1).finalStage.key).toBe("hoc")
  })

  it("sends large loans through every stage", () => {
    const route = resolveRoute(def, naira(20_000_000))
    expect(route.stages).toHaveLength(5)
    expect(route.totalSlaHours).toBe(8 + 24 + 24 + 24 + 48)
  })

  it("derives each stage's authority limit from the bands", () => {
    expect(authorityLimitForStage(def, "cm")).toBe(naira(500_000))
    expect(authorityLimitForStage(def, "analyst")).toBe(0)
    expect(authorityLimitForStage(def, "final")).toBeNull()
  })

  it("simulates without throwing on a broken definition", () => {
    const broken = retailWorkflow({ bands: [] })
    expect(simulateRoute(broken, 1).ok).toBe(false)
    expect(simulateRoute(def, naira(1_000_000))).toMatchObject({ ok: true })
  })
})

describe("maker-checker and authority", () => {
  const def = retailWorkflow()

  it("blocks the maker from deciding on their own application", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(1), cm.id)
    const result = canAct({ application: app, definition: def, actor: cm, delegations: [], now: NOW })
    expect(result).toMatchObject({ allowed: false, reason: "maker_checker" })
    expect(() => decide(app, cm)).toThrow(WorkflowEngineError)
  })

  it("blocks a delegate acting for the maker", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(1), "u-cm-away")
    const result = canAct({
      application: app,
      definition: def,
      actor: ro,
      delegations: [
        {
          fromUserId: "u-cm-away",
          fromUserName: "Ngozi Okafor",
          fromRole: "credit_manager",
          startsAt: hoursBefore(24),
          endsAt: hoursBefore(-24),
        },
      ],
      now: NOW,
    })
    expect(result).toMatchObject({ allowed: false, reason: "maker_checker" })
  })

  it("refuses users whose role is not on the current stage", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(1))
    expect(canAct({ application: app, definition: def, actor: ro, delegations: [], now: NOW })).toMatchObject({
      allowed: false,
      reason: "not_your_stage",
    })
  })

  it("lets an active delegate act on behalf of the delegator", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(1))
    const delegation = {
      fromUserId: "u-cm2",
      fromUserName: "Ibrahim Bello",
      fromRole: "credit_manager" as const,
      startsAt: hoursBefore(2),
      endsAt: hoursBefore(-2),
    }
    const result = canAct({ application: app, definition: def, actor: ro, delegations: [delegation], now: NOW })
    expect(result).toMatchObject({ allowed: true, actingRole: "credit_manager", onBehalfOf: { userId: "u-cm2" } })

    const expired = { ...delegation, endsAt: hoursBefore(1) }
    expect(canAct({ application: app, definition: def, actor: ro, delegations: [expired], now: NOW }).allowed).toBe(
      false,
    )
  })

  it("prevents one person approving at two stages", () => {
    const app = pendingAt(def, naira(1_000_000), "ro", hoursBefore(1))
    const afterRo = decide(app, ro)
    const promoted = { ...afterRo, createdById: "u-maker" }
    const sameUserNewRole: EngineActor = { id: ro.id, role: "credit_manager" }
    expect(
      canAct({ application: promoted, definition: def, actor: sameUserNewRole, delegations: [], now: NOW }),
    ).toMatchObject({
      allowed: false,
      reason: "segregation_of_duties",
    })
  })

  it("does not offer escalation at the final stage", () => {
    const app = pendingAt(def, naira(9_000_000), "final", hoursBefore(1))
    const result = canAct({
      application: app,
      definition: def,
      actor: { id: "u-md", role: "final_approver" },
      delegations: [],
      now: NOW,
    })
    expect(result.allowed && result.allowedActions).toEqual(["approve", "reject", "return", "request_info"])
  })
})

describe("decisions", () => {
  const def = retailWorkflow()

  it("requires a meaningful comment and a valid reason", () => {
    const app = pendingAt(def, naira(300_000), "ro", hoursBefore(1))
    expect(() => decide(app, ro, { ...approve, comment: "ok" })).toThrow(/at least 10 characters/)
    expect(() => decide(app, ro, { ...approve, reasonCode: "fraud_suspected" })).toThrow(/not a valid reason/)
  })

  it("advances to the next stage, then approves at the band's final stage", () => {
    const app = pendingAt(def, naira(300_000), "ro", hoursBefore(1))
    const first = decide(app, ro)
    expect(first).toMatchObject({ outcome: "advanced", status: "pending_approval" })
    expect(first.workflow.currentStageKey).toBe("cm")
    expect(first.workflow.stageEnteredAt).toBe(NOW.toISOString())

    const second = decide({ ...app, status: first.status, workflow: first.workflow }, cm)
    expect(second).toMatchObject({ outcome: "approved", status: "approved" })
    expect(second.workflow.decisions).toHaveLength(2)
  })

  it("rejects, returns and requests information", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(1))
    expect(
      decide(app, cm, { action: "reject", reasonCode: "adverse_bureau", comment: "Two written-off facilities on CRC." })
        .status,
    ).toBe("rejected")
    expect(
      decide(app, cm, {
        action: "return",
        reasonCode: "incomplete_documents",
        comment: "Payslip for August is missing.",
      }).status,
    ).toBe("returned")
    expect(
      decide(app, cm, {
        action: "request_info",
        reasonCode: "bank_statement",
        comment: "Need six months of statements.",
      }).status,
    ).toBe("more_info_requested")
  })

  it("resubmits a returned application to the stage that returned it", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(30))
    const returned = decide(app, cm, {
      action: "return",
      reasonCode: "data_mismatch",
      comment: "Employer name differs on payslip.",
    })
    const again = resubmit({ ...app, status: returned.status, workflow: returned.workflow }, NOW)
    expect(again.status).toBe("pending_approval")
    expect(again.workflow.currentStageKey).toBe("cm")
  })

  it("escalates beyond the band's final stage and extends the route", () => {
    const app = pendingAt(def, naira(300_000), "cm", hoursBefore(1))
    const result = decide(app, cm, {
      action: "escalate",
      reasonCode: "conflict_of_interest",
      comment: "Applicant is a relative of mine.",
    })
    expect(result.outcome).toBe("escalated")
    expect(result.workflow.currentStageKey).toBe("analyst")
    expect(result.workflow.route).toEqual(["ro", "cm", "analyst"])
  })

  it("waits for every role at an all-must-approve parallel stage", () => {
    const parallel = retailWorkflow()
    parallel.stages[3] = { ...parallel.stages[3], approverRoles: ["head_of_credit", "final_approver"], quorum: "all" }
    const app = pendingAt(parallel, naira(1_000_000), "hoc", hoursBefore(1))
    const hoc: EngineActor = { id: "u-hoc", role: "head_of_credit" }
    const md: EngineActor = { id: "u-md", role: "final_approver" }

    const first = decide(app, hoc, approve, parallel)
    expect(first.outcome).toBe("awaiting_parallel")
    const afterFirst = { ...app, workflow: first.workflow }
    expect(
      canAct({ application: afterFirst, definition: parallel, actor: hoc, delegations: [], now: NOW }),
    ).toMatchObject({ reason: "already_approved" })

    const second = decide(afterFirst, md, approve, parallel)
    expect(second.outcome).toBe("approved")
  })

  it("starts approval at the first stage of the resolved route", () => {
    const wf = startApproval(def, naira(6_000_000), NOW)
    expect(wf.route).toEqual(["ro", "cm", "analyst", "hoc", "final"])
    expect(wf.currentStageKey).toBe("ro")
  })
})

describe("SLA", () => {
  const stage = { slaHours: 24, reminderAtPercent: 75 }

  it("is on track, due soon, then breached", () => {
    expect(computeSla(stage, new Date(hoursBefore(10)), NOW).state).toBe("on_track")
    expect(computeSla(stage, new Date(hoursBefore(18)), NOW).state).toBe("due_soon")
    const breached = computeSla(stage, new Date(hoursBefore(30)), NOW)
    expect(breached.state).toBe("breached")
    expect(breached.remainingMs).toBe(-6 * 3_600_000)
  })

  it("auto-escalates only after the grace period", () => {
    const def = retailWorkflow()
    def.stages[1] = { ...def.stages[1], autoEscalateAfterHours: 4 }
    expect(autoEscalate(pendingAt(def, naira(300_000), "cm", hoursBefore(26)), def, "d", NOW)).toBeNull()
    const result = autoEscalate(pendingAt(def, naira(300_000), "cm", hoursBefore(29)), def, "d", NOW)
    expect(result?.workflow.currentStageKey).toBe("analyst")
    expect(result?.decision).toMatchObject({ automated: true, actorId: "system", reasonCode: "sla_breach" })
  })
})

describe("lifecycle", () => {
  it("only allows defined transitions", () => {
    expect(canTransition("approved", "offer_sent")).toBe(true)
    expect(canTransition("draft", "approved")).toBe(false)
    expect(canTransition("rejected", "pending_approval")).toBe(false)
    expect(canTransition("offer_accepted", "ready_for_disbursement")).toBe(true)
  })
})

describe("workflow validation", () => {
  it("accepts the default definition", () => {
    expect(validateWorkflow(retailWorkflow())).toEqual({ valid: true, issues: [] })
  })

  it("flags gaps, overlaps and a capped top band", () => {
    const def = retailWorkflow({
      bands: [
        { id: "b1", minAmount: 0, maxAmount: naira(500_000), finalStageKey: "cm" },
        { id: "b2", minAmount: naira(600_000), maxAmount: naira(5_000_000), finalStageKey: "hoc" },
        { id: "b3", minAmount: naira(4_000_000), maxAmount: naira(10_000_000), finalStageKey: "final" },
      ],
    })
    const messages = validateWorkflow(def).issues.map((i) => i.message)
    expect(messages).toEqual(
      expect.arrayContaining([
        "There is a gap between this band and the one below it.",
        "This band overlaps the one below it.",
        "The highest band must have no cap so every amount has a route.",
      ]),
    )
  })

  it("requires the uncapped band to close at the final stage, in order", () => {
    const def = retailWorkflow({
      bands: [
        { id: "b1", minAmount: 0, maxAmount: naira(500_000), finalStageKey: "hoc" },
        { id: "b2", minAmount: naira(500_000) + 1, maxAmount: null, finalStageKey: "cm" },
      ],
    })
    const messages = validateWorkflow(def).issues.map((i) => i.message)
    expect(messages).toContain("A larger amount cannot close at an earlier stage than a smaller one.")
    expect(messages).toContain("The uncapped band must close at the final stage.")
  })

  it("rejects auto-escalation on the final stage and duplicate keys", () => {
    const def = retailWorkflow()
    def.stages[4] = { ...def.stages[4], autoEscalateAfterHours: 2 }
    def.stages[2] = { ...def.stages[2], key: "cm" }
    const result = validateWorkflow(def)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toEqual(
      expect.arrayContaining(["stages.4.autoEscalateAfterHours", "stages.2.key"]),
    )
  })
})

describe("final approval committee (2 of 3)", () => {
  const def = retailWorkflow()
  def.stages[4] = { ...def.stages[4], committee: { memberIds: ["u-fa-1", "u-fa-2", "u-fa-3"], votesRequired: 2 } }
  const member = (n: number): EngineActor => ({ id: `u-fa-${n}`, role: "final_approver" })
  const decline: DecisionInput = {
    action: "reject",
    reasonCode: "insufficient_affordability",
    comment: "Repayment is too high for the income.",
  }
  const atCommittee = () => pendingAt(def, naira(8_000_000), "final", hoursBefore(2))
  const vote = (app: EngineApplication, actor: EngineActor, input: DecisionInput = approve) => {
    const result = decide(app, actor, input, def)
    return { ...app, status: result.status, workflow: result.workflow, outcome: result.outcome }
  }

  it("only lets named members vote", () => {
    const outsider: EngineActor = { id: "u-fa-9", role: "final_approver" }
    expect(
      canAct({ application: atCommittee(), definition: def, actor: outsider, delegations: [], now: NOW }),
    ).toMatchObject({ allowed: false, reason: "not_your_stage" })
  })

  it("approves on the second approve vote", () => {
    const first = vote(atCommittee(), member(1))
    expect(first.status).toBe("pending_approval")
    expect(first.outcome).toBe("awaiting_parallel")
    expect(first.workflow.stageVotes).toHaveLength(1)
    const second = vote(first, member(2))
    expect(second.status).toBe("approved")
  })

  it("stops a member voting twice", () => {
    const first = vote(atCommittee(), member(1))
    expect(canAct({ application: first, definition: def, actor: member(1), delegations: [], now: NOW })).toMatchObject({
      allowed: false,
      reason: "already_voted",
    })
  })

  it("survives one decline and rejects on the second", () => {
    const one = vote(atCommittee(), member(1), decline)
    expect(one.status).toBe("pending_approval")
    const split = vote(one, member(2))
    expect(split.status).toBe("pending_approval")
    const decided = vote(split, member(3), decline)
    expect(decided.status).toBe("rejected")
  })
})
