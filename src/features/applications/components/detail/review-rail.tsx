"use client"

import { useRef } from "react"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { useSession } from "@/features/auth/hooks/use-session"
import type { WorkflowDefinition, WorkflowStage } from "@/features/workflow/types"
import { cn } from "@/lib/utils"
import type { Application } from "../../types"
import { RailActions } from "./rail/actions"
import { Composer } from "./rail/composer"
import { CreditView } from "./rail/credit-view"
import { Discussion } from "./rail/discussion"
import { IdentityCheck } from "./rail/identity-check"
import { Pricing } from "./rail/pricing"
import type { ProductInfo } from "./ui"

interface ReviewRailProps {
  app: Application
  product?: ProductInfo
  stage: WorkflowStage | null
  definition?: WorkflowDefinition
  applicantName: string
  onOpenOffer: () => void
  className?: string
}

/**
 * One panel from top to bottom: the actions, the identity check, the pricing, the credit view,
 * then the team's comments with the comment box pinned at the foot.
 */
export function ReviewRail({
  app,
  product,
  stage,
  definition,
  applicantName,
  onOpenOffer,
  className,
}: ReviewRailProps) {
  const session = useSession()
  const { data: users = [] } = useUsers()
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
        <RailActions app={app} stage={stage} applicantName={applicantName} users={users} onOpenOffer={onOpenOffer} />
        <IdentityCheck app={app} name={applicantName} />
        {product && <Pricing app={app} product={product} />}
        <CreditView app={app} product={product} />
        <Discussion app={app} definition={definition} users={users} meId={session.user.id} />
      </div>
      <Composer applicationId={app.id} onSent={toLatest} />
    </aside>
  )
}
