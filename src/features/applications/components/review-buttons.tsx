"use client"

import { Ban, RotateCcw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { DecisionDialog } from "@/components/shared/decision-dialog"
import { Button } from "@/components/ui/button"
import { useSession } from "@/features/auth/hooks/use-session"
import { can } from "@/lib/rbac/can"
import { cn } from "@/lib/utils"
import { useRejectOrReturn } from "../hooks/use-applications"
import { useIsOnDesk } from "../hooks/use-is-on-desk"
import type { Application } from "../types"
import { REVIEW_STAGE } from "./transitions"

interface ReviewButtonsProps {
  application: Application
  applicantName: string
  /** Stretch to the container, e.g. in the side panel. */
  block?: boolean
}

/** Reject, or return to the officer, during verification and assessment. Each opens its own dialog. */
export function ReviewButtons({ application, applicantName, block }: ReviewButtonsProps) {
  const session = useSession()
  const review = useRejectOrReturn(application.id)
  const onDesk = useIsOnDesk(application)
  // Kept after closing so the dialog doesn't change title while it animates out.
  const [action, setAction] = useState<"reject" | "return">("reject")
  const [open, setOpen] = useState(false)
  const start = (next: "reject" | "return") => {
    setAction(next)
    setOpen(true)
  }
  const stage = REVIEW_STAGE[application.status]
  if (!stage || !can(session, stage.permission) || !onDesk) return null

  return (
    <>
      <Button variant="outline" className={cn(block && "w-full")} onClick={() => start("return")}>
        <RotateCcw aria-hidden /> Return
      </Button>
      <Button
        variant="outline"
        className={cn("text-destructive hover:text-destructive", block && "w-full")}
        onClick={() => start("reject")}
      >
        <Ban aria-hidden /> Reject
      </Button>
      <DecisionDialog
        open={open}
        onOpenChange={setOpen}
        action={action}
        context={{
          reference: application.reference,
          applicantName,
          amount: application.amountRequested,
          stageName: stage.stageName,
        }}
        onSubmit={async (input, pin) => {
          await review.mutateAsync({ input, pin })
          toast.success(input.action === "reject" ? "Application rejected" : "Returned to the relationship officer")
        }}
      />
    </>
  )
}
