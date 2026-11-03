"use client"

import { Eye, EyeOff, Lock } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCan } from "@/features/auth/hooks/use-session"
import { formatPhone, maskPhone, maskValue } from "@/lib/format/mask"
import { cn } from "@/lib/utils"

type MaskKind = "bvn" | "nin" | "phone" | "account"

interface MaskedValueProps {
  value: string
  kind: MaskKind
  /** Called when the value is revealed, so the reveal can be audited. */
  onReveal?: () => void
  className?: string
}

const LABEL: Record<MaskKind, string> = { bvn: "BVN", nin: "NIN", phone: "phone number", account: "account number" }
const REMASK_AFTER_MS = 30_000

/** Sensitive identifiers are masked by default; revealing needs `pii:reveal`. */
export function MaskedValue({ value, kind, onReveal, className }: MaskedValueProps) {
  const allowed = useCan("pii:reveal")
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!revealed) return
    const id = setTimeout(() => setRevealed(false), REMASK_AFTER_MS)
    return () => clearTimeout(id)
  }, [revealed])

  const masked = kind === "phone" ? maskPhone(value) : maskValue(value)
  const clear = kind === "phone" ? formatPhone(value) : value

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="tabular font-mono text-[0.8125rem]">{revealed ? clear : masked}</span>
      {allowed ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={revealed ? `Hide ${LABEL[kind]}` : `Reveal ${LABEL[kind]}`}
          aria-pressed={revealed}
          onClick={() => {
            if (!revealed) onReveal?.()
            setRevealed((r) => !r)
          }}
        >
          {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="inline-flex size-6 items-center justify-center text-muted-foreground"
              aria-label={`${LABEL[kind]} hidden`}
            >
              <Lock className="size-3" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent>Your role can&apos;t reveal the {LABEL[kind]}</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
