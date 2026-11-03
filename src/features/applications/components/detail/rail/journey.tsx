import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Application } from "../../../types"

/** The six phases every application moves through, in order. */
const PHASES = [
  { id: "intake", label: "Intake" },
  { id: "verify", label: "Verify" },
  { id: "assess", label: "Assess" },
  { id: "approve", label: "Approve" },
  { id: "offer", label: "Offer" },
  { id: "finance", label: "Finance" },
] as const

const PHASE_OF: Record<Application["status"], number> = {
  draft: 0,
  submitted: 1,
  in_verification: 1,
  in_assessment: 2,
  pending_approval: 3,
  returned: 3,
  more_info_requested: 3,
  approved: 4,
  offer_sent: 4,
  offer_accepted: 5,
  ready_for_disbursement: 6,
  rejected: -1,
}

/** A rejection stops at the furthest phase it reached; approval decisions count as Approve. */
function rejectedAtPhase(app: Application): number {
  if (app.workflow) return 3
  if (app.assessment) return 2
  return 1
}

/** Where the application is in its life: done phases ticked, the current one ringed, a rejection marked where it stopped. */
export function Journey({ app }: { app: Application }) {
  const rejected = app.status === "rejected"
  const current = rejected ? rejectedAtPhase(app) : PHASE_OF[app.status]
  return (
    <ol aria-label="Progress" className="flex items-start">
      {PHASES.map((p, i) => {
        const done = i < current
        const here = i === current
        const failed = rejected && here
        return (
          <li key={p.id} className="relative flex flex-1 flex-col items-center gap-1.5">
            {i > 0 && (
              <span
                aria-hidden
                className={cn("absolute top-[9px] right-1/2 h-0.5 w-full", done || here ? "bg-success" : "bg-border")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                done && "bg-success text-white",
                here && !failed && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                failed && "bg-destructive text-white ring-4 ring-destructive/15",
                !done && !here && "border-2 border-border bg-card",
              )}
            >
              {done ? (
                <Check className="size-3" strokeWidth={3.5} aria-hidden />
              ) : failed ? (
                <X className="size-3" strokeWidth={3.5} aria-hidden />
              ) : null}
            </span>
            <span
              className={cn(
                "text-[11px]",
                here
                  ? failed
                    ? "font-semibold text-destructive"
                    : "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {p.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
