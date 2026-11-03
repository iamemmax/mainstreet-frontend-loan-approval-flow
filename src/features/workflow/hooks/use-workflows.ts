"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchAllDelegations,
  fetchMyDelegations,
  fetchWorkflowDefinitions,
  publishWorkflow,
  workflowKeys,
} from "../api/workflows"
import type { WorkflowDefinition } from "../types"

export function useWorkflowDefinitions() {
  return useQuery({ queryKey: workflowKeys.definitions, queryFn: fetchWorkflowDefinitions, staleTime: 5 * 60_000 })
}

export function useMyDelegations() {
  return useQuery({ queryKey: workflowKeys.myDelegations, queryFn: fetchMyDelegations })
}

export function useAllDelegations() {
  return useQuery({ queryKey: workflowKeys.allDelegations, queryFn: fetchAllDelegations, staleTime: 5 * 60_000 })
}

export function usePublishWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: WorkflowDefinition) => publishWorkflow(draft),
    onSuccess: (published) =>
      queryClient.setQueryData<WorkflowDefinition[]>(workflowKeys.definitions, (list) =>
        list?.map((w) => (w.id === published.id ? published : w)),
      ),
  })
}
