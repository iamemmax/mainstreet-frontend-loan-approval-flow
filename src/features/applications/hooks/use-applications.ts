"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { auditKeys } from "@/features/audit/api/audit"
import { dashboardKeys } from "@/features/dashboard/api/dashboard"
import { notificationKeys } from "@/features/notifications/api/notifications"
import type { DecisionInput } from "@/features/workflow/types"
import type { AssessmentInput } from "@/mocks/handlers/actions"
import {
  adjustOffer,
  answerOffer,
  applicationKeys,
  decideApplication,
  fetchAccount,
  fetchBvnRecord,
  fetchApplication,
  fetchApplications,
  fetchMyWork,
  fetchOffer,
  moveApplication,
  rejectOrReturn,
  runChecks,
  saveDraft,
  sendMessage,
  submitAssessment,
  submitNewApplication,
  submitStatementsForAnalysis,
} from "../api/applications"
import type {
  AdjustOfferInput,
  Application,
  ApplicationListParams,
  ApplicationTransition,
  NewApplicationInput,
} from "../types"

export function useApplications(params: ApplicationListParams, { enabled = true } = {}) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: () => fetchApplications(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Looks up a current account once a full 10-digit number is entered. The form shows "not found" itself. */
export function useCustomerAccount(accountNumber: string) {
  return useQuery({
    queryKey: applicationKeys.account(accountNumber),
    queryFn: () => fetchAccount(accountNumber),
    enabled: /^\d{10}$/.test(accountNumber),
    staleTime: 5 * 60_000,
  })
}

/** Looks up an account straight away, e.g. as the last digit is typed. Shares the cache with `useCustomerAccount`. */
export function useFetchAccount() {
  const queryClient = useQueryClient()
  return (accountNumber: string) =>
    queryClient.fetchQuery({
      queryKey: applicationKeys.account(accountNumber),
      queryFn: () => fetchAccount(accountNumber),
      staleTime: 5 * 60_000,
    })
}

/** Sends an SME's statements for analysis. Nothing is saved, so nothing needs refetching. The step shows its own errors. */
export function useAnalyseStatements() {
  return useMutation({ mutationFn: submitStatementsForAnalysis, meta: { inlineErrors: true } })
}

/** Looks a BVN up straight away, e.g. as the last digit is typed. Register entries rarely change. */
export function useFetchBvnRecord() {
  const queryClient = useQueryClient()
  return (bvn: string) =>
    queryClient.fetchQuery({
      queryKey: applicationKeys.bvn(bvn),
      queryFn: () => fetchBvnRecord(bvn),
      staleTime: 10 * 60_000,
    })
}

export function useApplication(id: string) {
  return useQuery({ queryKey: applicationKeys.detail(id), queryFn: () => fetchApplication(id), enabled: !!id })
}

export function useMyWork({ enabled = true } = {}) {
  return useQuery({ queryKey: applicationKeys.myWork(), queryFn: fetchMyWork, refetchInterval: 60_000, enabled })
}

/** After any write, the detail is replaced and every list, queue and summary refetches. */
function useOnApplicationChanged() {
  const queryClient = useQueryClient()
  return (app: Application) => {
    queryClient.setQueryData(applicationKeys.detail(app.id), app)
    void queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: applicationKeys.myWork() })
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    void queryClient.invalidateQueries({ queryKey: auditKeys.all })
    void queryClient.invalidateQueries({ queryKey: ["reports"] })
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  }
}

export function useDecideApplication(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({
    mutationFn: ({ input, pin }: { input: DecisionInput; pin: string }) => decideApplication(id, input, pin),
    onSuccess: onChanged,
  })
}

export function useRejectOrReturn(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({
    mutationFn: ({ input, pin }: { input: DecisionInput; pin: string }) => rejectOrReturn(id, input, pin),
    onSuccess: onChanged,
  })
}

export function useAdjustOffer(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({
    mutationFn: ({ input, pin }: { input: AdjustOfferInput; pin: string }) => adjustOffer(id, input, pin),
    onSuccess: onChanged,
  })
}

export function useSendMessage(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({ mutationFn: (body: string) => sendMessage(id, { body }), onSuccess: onChanged })
}

export function useMoveApplication(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({
    mutationFn: ({ transition, pin }: { transition: ApplicationTransition; pin: string }) =>
      moveApplication(id, transition, pin),
    onSuccess: onChanged,
  })
}

export function useRunChecks(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({ mutationFn: (pin: string) => runChecks(id, pin), onSuccess: onChanged })
}

export function useSaveAssessment(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({
    mutationFn: ({ input, pin }: { input: AssessmentInput; pin: string }) => submitAssessment(id, input, pin),
    onSuccess: onChanged,
  })
}

export function useCreateApplication() {
  const onChanged = useOnApplicationChanged()
  return useMutation({ mutationFn: (input: NewApplicationInput) => submitNewApplication(input), onSuccess: onChanged })
}

/** Saves a draft again, or submits it, from the continue-application form. */
export function useSaveDraft(id: string) {
  const onChanged = useOnApplicationChanged()
  return useMutation({ mutationFn: (input: NewApplicationInput) => saveDraft(id, input), onSuccess: onChanged })
}

export function useOffer(token: string) {
  return useQuery({ queryKey: applicationKeys.offer(token), queryFn: () => fetchOffer(token), retry: false })
}

export function useAnswerOffer(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (accept: boolean) => answerOffer(token, accept),
    // The customer page shows its own message; the staff error modal isn't for customers.
    meta: { inlineErrors: true },
    onSuccess: (view) => queryClient.setQueryData(applicationKeys.offer(token), view),
  })
}
