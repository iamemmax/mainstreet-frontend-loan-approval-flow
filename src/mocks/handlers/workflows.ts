import type { Session } from "@/features/auth/types"
import { validateWorkflow } from "@/features/workflow/engine"
import type { WorkflowDefinition } from "@/features/workflow/types"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"

/**
 * Publishes a new version of a workflow. In-flight applications keep the
 * route fixed at submission, so a stage can't be removed while any
 * application still has it ahead of it.
 */
export function saveWorkflow(store: MockStore, session: Session, draft: WorkflowDefinition) {
  const current = store.workflows.find((w) => w.id === draft.id)
  if (!current) throw new ApiError(404, "not_found", "Workflow not found")
  if (draft.version !== current.version) {
    throw new ApiError(409, "stale", "Someone else published a newer version. Reload to see their changes.")
  }
  const validation = validateWorkflow(draft)
  if (!validation.valid)
    throw new ApiError(
      422,
      "invalid_workflow",
      validation.issues.find((i) => i.severity === "error")!.message,
      validation.issues,
    )

  const keys = new Set(draft.stages.map((s) => s.key))
  const blocked = new Map<string, number>()
  for (const app of store.applications) {
    const wf = app.workflow
    if (app.status !== "pending_approval" || wf?.definitionId !== draft.id || !wf.currentStageKey) continue
    for (const key of wf.route.slice(wf.route.indexOf(wf.currentStageKey))) {
      if (!keys.has(key)) blocked.set(key, (blocked.get(key) ?? 0) + 1)
    }
  }
  if (blocked.size) {
    const [key, count] = [...blocked.entries()][0]
    const name = current.stages.find((s) => s.key === key)?.name ?? key
    throw new ApiError(
      409,
      "stage_in_use",
      `${count} application${count === 1 ? " is" : "s are"} still routed through ${name}. Keep the stage until they have passed it.`,
    )
  }

  const now = new Date().toISOString()
  const published: WorkflowDefinition = {
    ...draft,
    version: current.version + 1,
    updatedAt: now,
    updatedById: session.user.id,
  }
  store.workflows = store.workflows.map((w) => (w.id === draft.id ? published : w))
  store.audit.unshift({
    id: `aud-${store.audit.length + 1}`,
    at: now,
    actorId: session.user.id,
    actorName: session.user.name,
    action: "workflow.published",
    entity: "workflow",
    entityId: draft.id,
    entityLabel: `${draft.name} v${published.version}`,
    summary: `Published ${draft.name} version ${published.version}`,
    metadata: { stages: draft.stages.length, bands: draft.bands.length },
  })
  return published
}
