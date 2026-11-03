import { z } from "zod"
import { mockRequest } from "@/mocks/transport"
import { saveWorkflow } from "@/mocks/handlers/workflows"
import { delegationSchema, workflowDefinitionSchema } from "../schemas/workflow"
import type { WorkflowDefinition } from "../types"

export const workflowKeys = {
  definitions: ["workflows", "definitions"] as const,
  myDelegations: ["workflows", "delegations", "mine"] as const,
  allDelegations: ["workflows", "delegations", "all"] as const,
}

export function fetchWorkflowDefinitions() {
  return mockRequest(z.array(workflowDefinitionSchema), ({ store }) => store.workflows)
}

// Real backend: apiFetch(`/admin/workflows/${id}`, { method: "PUT", body: draft, schema: workflowDefinitionSchema })
export function publishWorkflow(draft: WorkflowDefinition) {
  const body = workflowDefinitionSchema.parse(draft)
  return mockRequest(workflowDefinitionSchema, ({ store, session }) => saveWorkflow(store, session, body), {
    permission: "admin:workflow",
  })
}

/** Every delegation, so a page can show who is covering whom. */
export function fetchAllDelegations() {
  return mockRequest(z.array(delegationSchema), ({ store }) => store.delegations, { permission: "application:view" })
}

/** Delegations I have given or received. */
export function fetchMyDelegations() {
  return mockRequest(z.array(delegationSchema), ({ store, session }) =>
    store.delegations.filter((d) => d.toUserId === session.user.id || d.fromUserId === session.user.id),
  )
}
