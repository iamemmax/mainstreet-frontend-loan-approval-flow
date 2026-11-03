"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { landingPathFor } from "@/lib/rbac/landing"
import { authKeys, checkPassword, signIn, signOut } from "../api/session"

export function useSignIn({ next }: { next?: string } = {}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: signIn,
    onSuccess: (session) => {
      // A different user sees different data — drop everything cached.
      queryClient.clear()
      queryClient.setQueryData(authKeys.session, session)
      router.replace(next ?? landingPathFor())
    },
  })
}

export function useCheckPassword() {
  return useMutation({ mutationFn: checkPassword })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear()
      router.replace("/login")
    },
  })
}
