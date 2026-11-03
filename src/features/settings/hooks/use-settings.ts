"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { applicationKeys } from "@/features/applications/api/applications"
import {
  addDelegation,
  fetchDelegateCandidates,
  fetchNotificationPrefs,
  fetchPasswordStatus,
  removeDelegation,
  settingsKeys,
  updateNotificationPrefs,
  updatePassword,
  updatePin,
} from "../api/settings"
import type { ChangePasswordInput, ChangePinInput, NewDelegationInput, NotificationPrefs } from "../types"

export function useChangePin() {
  return useMutation({ mutationFn: (input: ChangePinInput) => updatePin(input) })
}

export function usePasswordStatus() {
  return useQuery({ queryKey: settingsKeys.password, queryFn: fetchPasswordStatus })
}

export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => updatePassword(input),
    onSuccess: (status) => queryClient.setQueryData(settingsKeys.password, status),
  })
}

export function useNotificationPrefs() {
  return useQuery({ queryKey: settingsKeys.notificationPrefs, queryFn: fetchNotificationPrefs })
}

export function useSaveNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) => updateNotificationPrefs(prefs),
    onSuccess: (prefs) => queryClient.setQueryData(settingsKeys.notificationPrefs, prefs),
  })
}

export function useDelegateCandidates({ enabled = true } = {}) {
  return useQuery({ queryKey: settingsKeys.delegateCandidates, queryFn: fetchDelegateCandidates, enabled })
}

/** A delegation changes who can see and act on approvals, so refresh those too. */
function useOnDelegationChanged() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["workflows", "delegations"] })
    void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
  }
}

export function useAddDelegation() {
  const onChanged = useOnDelegationChanged()
  return useMutation({
    mutationFn: ({ input, pin }: { input: NewDelegationInput; pin: string }) => addDelegation(input, pin),
    onSuccess: onChanged,
  })
}

export function useCancelDelegation() {
  const onChanged = useOnDelegationChanged()
  return useMutation({ mutationFn: (id: string) => removeDelegation(id), onSuccess: onChanged })
}
