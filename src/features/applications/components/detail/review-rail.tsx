"use client"

import { useRef } from "react"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { useSession } from "@/features/auth/hooks/use-session"
import { useAllDelegations } from "@/features/workflow/hooks/use-workflows"
import type { WorkflowDefinition, WorkflowStage } from "@/features/workflow/types"
import { cn } from "@/lib/utils"
import type { Application } from "../../types"
import type { scoreApplication } from "../../utils/scorecard"
import { Checklist } from "./rail/checklist"
import { Composer } from "./rail/composer"
import { CreditView } from "./rail/credit-view"
import { Discussion } from "./rail/discussion"
import { IdentityCheck } from "./rail/identity-check"
import { NextStep } from "./rail/next-step"

interface ReviewRailProps {
  app: Application
  product?: Parameters<typeof scoreApplication>[1]
  stage: WorkflowStage | null
  definition?: WorkflowDefinition
  applicantName: string
  className?: string
}

/**
 * One panel from top to bottom: what happens next, the identity check, the credit view, the
 * checklist, then the team's discussion with the message box pinned at the foot.
 */
export function ReviewRail({ app, product, stage, definition, applicantName, className }: ReviewRailProps) {
  const session = useSession()
  const { data: users = [] } = useUsers()
  const { data: delegations = [] } = useAllDelegations()
  const scroller = useRef<HTMLDivElement>(null)
  const toLatest = () =>
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }))

  return (
    <aside
      aria-label="Review panel"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]",
        className,
      )}
    >
      <div ref={scroller} className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto overscroll-contain">
        <NextStep app={app} stage={stage} applicantName={applicantName} users={users} delegations={delegations} />
        <IdentityCheck app={app} name={applicantName} />
        <CreditView app={app} product={product} />
        <Checklist app={app} />
        <Discussion app={app} definition={definition} users={users} meId={session.user.id} />
      </div>
      <Composer applicationId={app.id} onSent={toLatest} />
    </aside>
  )
}
