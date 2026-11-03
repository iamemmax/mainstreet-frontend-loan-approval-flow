"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionQuery } from "@/features/auth/hooks/use-session"
import { landingPathFor } from "@/lib/rbac/landing"

/** Sends signed-in staff to their landing page, everyone else to sign-in. */
export default function RootPage() {
  const router = useRouter()
  const { data: session, isPending } = useSessionQuery()

  useEffect(() => {
    if (isPending) return
    router.replace(session ? landingPathFor() : "/login")
  }, [isPending, session, router])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <Skeleton className="h-8 w-48" />
    </div>
  )
}
