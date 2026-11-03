import type { SlaState } from "@/features/applications/schemas/status"
import type { WorkflowStage } from "../types"

const HOUR = 3_600_000

export interface SlaStatus {
  state: SlaState
  dueAt: Date
  elapsedMs: number
  /** Negative once breached. */
  remainingMs: number
  /** Share of the SLA used, can exceed 1. */
  ratio: number
}

/**
 * SLA is measured in elapsed calendar hours from the moment the application
 * entered the stage. "Due soon" starts at the stage's reminder threshold.
 */
export function computeSla(
  stage: Pick<WorkflowStage, "slaHours" | "reminderAtPercent">,
  enteredAt: Date,
  now: Date,
): SlaStatus {
  const budget = stage.slaHours * HOUR
  const elapsedMs = Math.max(0, now.getTime() - enteredAt.getTime())
  const ratio = elapsedMs / budget
  let state: SlaState = "on_track"
  if (ratio >= 1) state = "breached"
  else if (ratio * 100 >= stage.reminderAtPercent) state = "due_soon"
  return {
    state,
    dueAt: new Date(enteredAt.getTime() + budget),
    elapsedMs,
    remainingMs: budget - elapsedMs,
    ratio,
  }
}

export type EscalationSignal = "none" | "remind" | "escalate"

/** What the SLA scheduler should do for an application sitting in this stage. */
export function evaluateEscalation(stage: WorkflowStage, enteredAt: Date, now: Date): EscalationSignal {
  const sla = computeSla(stage, enteredAt, now)
  if (
    stage.autoEscalateAfterHours !== null &&
    sla.state === "breached" &&
    -sla.remainingMs >= stage.autoEscalateAfterHours * HOUR
  ) {
    return "escalate"
  }
  return sla.state === "on_track" ? "none" : "remind"
}
