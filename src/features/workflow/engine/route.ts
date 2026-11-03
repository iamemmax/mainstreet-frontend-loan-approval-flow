import type { ApprovalBand, WorkflowDefinition, WorkflowStage } from "../types"
import { WorkflowEngineError } from "./errors"

export interface ResolvedRoute {
  band: ApprovalBand
  stages: WorkflowStage[]
  finalStage: WorkflowStage
  /** Sum of the SLA hours of every stage on the route. */
  totalSlaHours: number
}

export function findBand(definition: WorkflowDefinition, amount: number): ApprovalBand | undefined {
  return definition.bands.find((b) => amount >= b.minAmount && (b.maxAmount === null || amount <= b.maxAmount))
}

/** Which stages an application of this amount passes through. */
export function resolveRoute(definition: WorkflowDefinition, amount: number): ResolvedRoute {
  const band = findBand(definition, amount)
  if (!band) {
    throw new WorkflowEngineError("no_matching_band", `No approval band covers an amount of ${amount} kobo`)
  }
  const finalIndex = definition.stages.findIndex((s) => s.key === band.finalStageKey)
  if (finalIndex === -1) {
    throw new WorkflowEngineError("unknown_stage", `Band ${band.id} closes at unknown stage ${band.finalStageKey}`)
  }
  const stages = definition.stages.slice(0, finalIndex + 1)
  return {
    band,
    stages,
    finalStage: stages[finalIndex],
    totalSlaHours: stages.reduce((sum, s) => sum + s.slaHours, 0),
  }
}

export function getStage(definition: WorkflowDefinition, key: string): WorkflowStage {
  const stage = definition.stages.find((s) => s.key === key)
  if (!stage) throw new WorkflowEngineError("unknown_stage", `Unknown stage ${key}`)
  return stage
}

/** The stage after `key` in the full definition (escalation target), if any. */
export function nextStageInDefinition(definition: WorkflowDefinition, key: string): WorkflowStage | null {
  const i = definition.stages.findIndex((s) => s.key === key)
  return i >= 0 && i < definition.stages.length - 1 ? definition.stages[i + 1] : null
}
