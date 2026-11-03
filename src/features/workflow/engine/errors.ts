export type EngineErrorCode =
  "invalid_transition" | "not_allowed" | "invalid_decision" | "no_matching_band" | "unknown_stage"

export class WorkflowEngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "WorkflowEngineError"
  }
}
