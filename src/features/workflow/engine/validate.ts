import type { WorkflowDefinition } from "../types"
import { resolveRoute, type ResolvedRoute } from "./route"

export interface ValidationIssue {
  severity: "error" | "warning"
  /** Dotted path into the definition, e.g. "bands.2.maxAmount". */
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

/** Checks a workflow definition before it can be published. */
export function validateWorkflow(definition: WorkflowDefinition): ValidationResult {
  const issues: ValidationIssue[] = []
  const error = (path: string, message: string) => issues.push({ severity: "error", path, message })
  const warn = (path: string, message: string) => issues.push({ severity: "warning", path, message })

  const { stages, bands } = definition
  if (stages.length === 0) error("stages", "Add at least one stage.")

  const seen = new Set<string>()
  stages.forEach((s, i) => {
    if (seen.has(s.key)) error(`stages.${i}.key`, `Stage key "${s.key}" is used more than once.`)
    seen.add(s.key)
    if (new Set(s.approverRoles).size !== s.approverRoles.length) {
      error(`stages.${i}.approverRoles`, `${s.name} lists the same role twice.`)
    }
    if (s.quorum === "all" && s.approverRoles.length === 1) {
      warn(`stages.${i}.quorum`, `${s.name} has one approver, so "all must approve" has no effect.`)
    }
    if (s.committee) {
      if (new Set(s.committee.memberIds).size !== s.committee.memberIds.length)
        error(`stages.${i}.committee`, `${s.name} lists the same member twice.`)
      if (s.committee.votesRequired > s.committee.memberIds.length) {
        error(
          `stages.${i}.committee`,
          `${s.name} needs ${s.committee.votesRequired} votes but has only ${s.committee.memberIds.length} members.`,
        )
      }
      if (s.committee.votesRequired <= s.committee.memberIds.length / 2) {
        warn(`stages.${i}.committee`, `${s.name} can approve without a majority of its members.`)
      }
    }
    if (i === stages.length - 1 && s.autoEscalateAfterHours !== null) {
      error(`stages.${i}.autoEscalateAfterHours`, `${s.name} is the final stage and has nowhere to escalate to.`)
    }
  })

  if (bands.length === 0) {
    error("bands", "Add at least one approval limit band.")
    return { valid: false, issues }
  }

  const stageIndex = new Map(stages.map((s, i) => [s.key, i]))
  const sorted = bands.map((b, i) => ({ band: b, i })).sort((a, b) => a.band.minAmount - b.band.minAmount)

  if (sorted[0].band.minAmount !== 0) {
    error(`bands.${sorted[0].i}.minAmount`, "The first band must start at ₦0.")
  }

  let lastStageIndex = -1
  sorted.forEach(({ band, i }, pos) => {
    const isLast = pos === sorted.length - 1
    if (band.maxAmount !== null && band.maxAmount < band.minAmount) {
      error(`bands.${i}.maxAmount`, "The upper limit is below the lower limit.")
    }
    if (!isLast) {
      if (band.maxAmount === null) {
        error(`bands.${i}.maxAmount`, "Only the highest band can be uncapped.")
      } else {
        const nextMin = sorted[pos + 1].band.minAmount
        if (nextMin > band.maxAmount + 1)
          error(`bands.${sorted[pos + 1].i}.minAmount`, "There is a gap between this band and the one below it.")
        if (nextMin <= band.maxAmount)
          error(`bands.${sorted[pos + 1].i}.minAmount`, "This band overlaps the one below it.")
      }
    } else if (band.maxAmount !== null) {
      error(`bands.${i}.maxAmount`, "The highest band must have no cap so every amount has a route.")
    }

    const idx = stageIndex.get(band.finalStageKey)
    if (idx === undefined) {
      error(`bands.${i}.finalStageKey`, "This band closes at a stage that does not exist.")
      return
    }
    if (idx < lastStageIndex) {
      error(`bands.${i}.finalStageKey`, "A larger amount cannot close at an earlier stage than a smaller one.")
    }
    lastStageIndex = Math.max(lastStageIndex, idx)
    if (isLast && idx !== stages.length - 1) {
      error(`bands.${i}.finalStageKey`, "The uncapped band must close at the final stage.")
    }
  })

  return { valid: !issues.some((i) => i.severity === "error"), issues }
}

export type SimulationResult = { ok: true; route: ResolvedRoute } | { ok: false; message: string }

/** "Enter an amount → see the stages it passes through." Never throws. */
export function simulateRoute(definition: WorkflowDefinition, amount: number): SimulationResult {
  try {
    return { ok: true, route: resolveRoute(definition, amount) }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unable to resolve a route" }
  }
}
