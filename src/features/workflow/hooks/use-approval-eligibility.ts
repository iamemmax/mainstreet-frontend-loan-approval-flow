"use client"

import { useMemo } from "react"
import type { Application } from "@/features/applications/types"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { useSession } from "@/features/auth/hooks/use-session"
import { useNow } from "@/hooks/use-now"
import { canAct, type ActEvaluation, type EngineDelegation } from "../engine"
import { useMyDelegations, useWorkflowDefinitions } from "./use-workflows"

/**
 * Asks the workflow engine whether the signed-in user may decide on this
 * application right now. The action bar renders exactly what this returns.
 */
export function useApprovalEligibility(application: Application | undefined): ActEvaluation | undefined {
  const session = useSession()
  const now = useNow(60_000)
  const { data: definitions } = useWorkflowDefinitions()
  const { data: delegations } = useMyDelegations()
  const { data: users } = useUsers()

  return useMemo(() => {
    if (!application || !definitions || !delegations || !users) return undefined
    const definition = definitions.find((d) => d.id === application.workflow?.definitionId)
    if (!definition)
      return { allowed: false, reason: "not_pending", message: "This application is not in an approval workflow." }

    const received: EngineDelegation[] = delegations
      .filter((d) => d.toUserId === session.user.id)
      .flatMap((d) => {
        const from = users.find((u) => u.id === d.fromUserId)
        return from
          ? [
              {
                fromUserId: from.id,
                fromUserName: from.name,
                fromRole: from.role,
                startsAt: d.startsAt,
                endsAt: d.endsAt,
              },
            ]
          : []
      })

    return canAct({
      application,
      definition,
      actor: { id: session.user.id, role: session.user.role },
      delegations: received,
      now,
    })
  }, [application, definitions, delegations, users, session, now])
}
