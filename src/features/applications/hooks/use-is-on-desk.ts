"use client"

import { useSession } from "@/features/auth/hooks/use-session"
import { useApprovalEligibility } from "@/features/workflow/hooks/use-approval-eligibility"
import type { Application } from "../types"
import { isOnDesk } from "../utils/desk"

/** Whether the application is with the signed-in user right now, so they may change it. */
export function useIsOnDesk(app: Application): boolean {
  const session = useSession()
  const eligibility = useApprovalEligibility(app)
  return isOnDesk(app, session.user, eligibility?.allowed ?? false)
}
