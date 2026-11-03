"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Role } from "@/lib/rbac/roles"
import type { Permission } from "@/lib/rbac/permissions"
import {
  fetchReferenceData,
  fetchRolePermissions,
  fetchUsers,
  referenceKeys,
  saveRolePermissions,
  updateProduct,
  updateUserStatus,
} from "../api/reference"
import type { Product } from "../types"

/** Branches, regions, agents and products. Rarely changes, so cached for the session. */
export function useReferenceData() {
  return useQuery({ queryKey: referenceKeys.all, queryFn: fetchReferenceData, staleTime: 10 * 60_000 })
}

export function useUsers() {
  return useQuery({ queryKey: referenceKeys.users, queryFn: fetchUsers, staleTime: 5 * 60_000 })
}

export function useRolePermissions() {
  return useQuery({ queryKey: referenceKeys.rolePermissions, queryFn: fetchRolePermissions })
}

export function useSaveRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ role, permissions }: { role: Role; permissions: Permission[] }) =>
      saveRolePermissions(role, permissions),
    onSuccess: (data) => {
      queryClient.setQueryData(referenceKeys.rolePermissions, data)
      void queryClient.invalidateQueries({ queryKey: ["auth", "session"] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Product, "active" | "monthlyRateBps">> }) =>
      updateProduct(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: referenceKeys.all, exact: true }),
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) => updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: referenceKeys.users }),
  })
}
