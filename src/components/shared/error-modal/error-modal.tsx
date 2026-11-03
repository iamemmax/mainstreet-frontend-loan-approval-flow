"use client"

import { Clock, LockKeyhole, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Burst } from "./burst"
import { errorCopy, type ErrorTone } from "./copy"
import { dismissError, useCurrentError } from "./store"

const ICON = { x: X, lock: LockKeyhole, clock: Clock } as const

const TONE: Record<ErrorTone, { band: string; ring: string; halo: string; badge: string; confetti: string }> = {
  danger: {
    band: "from-destructive/[0.08]",
    ring: "bg-destructive/[0.05]",
    halo: "bg-destructive/[0.08]",
    badge: "bg-destructive shadow-[0_10px_20px_-8px] shadow-destructive/70",
    confetti: "text-destructive/70",
  },
  warning: {
    band: "from-warning/[0.12]",
    ring: "bg-warning/[0.07]",
    halo: "bg-warning/[0.12]",
    badge: "bg-warning shadow-[0_10px_20px_-8px] shadow-warning/70",
    confetti: "text-warning/80",
  },
}

/** Mounted once in the providers; shows whatever was passed to showError(). */
export function ErrorModalHost() {
  const error = useCurrentError()
  if (!error) return null
  const copy = errorCopy(error)
  const tone = TONE[copy.tone]
  const Icon = ICON[copy.icon]

  return (
    <Dialog open onOpenChange={(open) => !open && dismissError()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[420px] [&>[data-slot=dialog-close]]:top-5 [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:flex [&>[data-slot=dialog-close]]:size-9 [&>[data-slot=dialog-close]]:items-center [&>[data-slot=dialog-close]]:justify-center [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-card [&>[data-slot=dialog-close]]:opacity-100 [&>[data-slot=dialog-close]]:shadow-xs"
      >
        <div className={cn("relative bg-gradient-to-b to-transparent px-8 pt-12 text-center", tone.band)}>
          <Burst className={tone.confetti} />
          <div className={cn("relative mx-auto flex size-36 items-center justify-center rounded-full", tone.ring)}>
            <div className={cn("flex size-[6.5rem] items-center justify-center rounded-full", tone.halo)}>
              <span
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-full text-white duration-500 animate-in fade-in zoom-in-50",
                  tone.badge,
                )}
              >
                {/* A soft highlight so the badge reads as a raised button, not a flat dot. */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent"
                />
                <Icon className="relative size-8" strokeWidth={3.25} aria-hidden />
              </span>
            </div>
          </div>
          <DialogTitle className="mt-5 text-2xl font-bold tracking-tight">{copy.title}</DialogTitle>
          <DialogDescription className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-relaxed text-pretty">
            {copy.description}
          </DialogDescription>
        </div>

        <div className="px-7 pt-6 pb-7">
          <div className="rounded-2xl bg-muted/60 px-5 py-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              What you can do
            </div>
            <ol className="mt-3 space-y-3">
              {copy.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-[11px] font-semibold text-muted-foreground shadow-xs">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="border-t px-7 py-5">
          <Button
            variant="secondary"
            className="h-12 w-full rounded-xl text-[15px] font-semibold"
            onClick={dismissError}
          >
            Okay, got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
