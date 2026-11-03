"use client"

import { NewApplicationForm } from "@/features/applications/components/new-application/new-application-form"
import { useSession } from "@/features/auth/hooks/use-session"

export function StaffNewApplication() {
  const { user } = useSession()
  return <NewApplicationForm defaultBranchId={user.branchId} />
}
