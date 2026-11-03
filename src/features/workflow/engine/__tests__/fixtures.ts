import type { WorkflowDefinition, WorkflowStage } from "../../types"
import type { EngineApplication } from "../authority"

const NAIRA = 100
export const naira = (n: number) => n * NAIRA

const stage = (key: string, role: WorkflowStage["approverRoles"][number], slaHours = 24): WorkflowStage => ({
  key,
  name: key.replace(/_/g, " "),
  approverRoles: [role],
  quorum: "any",
  slaHours,
  reminderAtPercent: 75,
  autoEscalateAfterHours: null,
  committee: null,
})

export function retailWorkflow(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
  return {
    id: "wf-retail",
    name: "Retail",
    segment: "retail",
    version: 1,
    stages: [
      stage("ro", "relationship_officer", 8),
      stage("cm", "credit_manager"),
      stage("analyst", "credit_analyst"),
      stage("hoc", "head_of_credit"),
      stage("final", "final_approver", 48),
    ],
    bands: [
      { id: "b1", minAmount: 0, maxAmount: naira(500_000), finalStageKey: "cm" },
      { id: "b2", minAmount: naira(500_000) + 1, maxAmount: naira(5_000_000), finalStageKey: "hoc" },
      { id: "b3", minAmount: naira(5_000_000) + 1, maxAmount: null, finalStageKey: "final" },
    ],
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedById: "u-admin",
    ...overrides,
  }
}

export function pendingAt(
  definition: WorkflowDefinition,
  amount: number,
  stageKey: string,
  enteredAt: string,
  createdById = "u-maker",
): EngineApplication {
  const finalKey = definition.bands.find(
    (b) => amount >= b.minAmount && (b.maxAmount === null || amount <= b.maxAmount),
  )!.finalStageKey
  const finalIndex = definition.stages.findIndex((s) => s.key === finalKey)
  return {
    status: "pending_approval",
    createdById,
    workflow: {
      definitionId: definition.id,
      definitionVersion: definition.version,
      route: definition.stages.slice(0, finalIndex + 1).map((s) => s.key),
      currentStageKey: stageKey,
      stageEnteredAt: enteredAt,
      stageVotes: [],
      stageApprovals: [],
      decisions: [],
    },
  }
}

export const NOW = new Date("2026-03-10T12:00:00.000Z")
export const hoursBefore = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()
