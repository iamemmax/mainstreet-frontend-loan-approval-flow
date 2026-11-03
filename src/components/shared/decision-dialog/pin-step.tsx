"use client"

import { DECISION_REASONS } from "@/features/workflow/engine/reasons"
import type { DecisionInput } from "@/features/workflow/types"
import { ModalFacts, ModalNote } from "../modal"
import { PinPad } from "../pin-confirm"
import { actionLabel, irreversibleWarning, type CommitteeRule } from "./copy"

interface PinStepProps {
  decision: DecisionInput
  pin: string
  onPinChange: (pin: string) => void
  onComplete: (pin: string) => void
  error: string | null
  submitting: boolean
  committee?: CommitteeRule | null
}

/** Step 2: show what's being signed, then take the approver's PIN. */
export function PinStep({ decision, pin, onPinChange, onComplete, error, submitting, committee }: PinStepProps) {
  const warning = irreversibleWarning(decision.action, committee)
  const reason = DECISION_REASONS[decision.action].find((r) => r.code === decision.reasonCode)?.label

  return (
    <>
      <div className="space-y-3">
        <ModalFacts
          items={[
            { label: "Decision", value: actionLabel(decision.action, committee) },
            { label: "Reason", value: <span title={reason}>{reason}</span> },
          ]}
        />
        <blockquote className="border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line">
          {decision.comment}
        </blockquote>
      </div>
      {warning && <ModalNote>{warning}</ModalNote>}
      <PinPad
        pin={pin}
        onPinChange={onPinChange}
        onComplete={onComplete}
        error={error}
        submitting={submitting}
        label="Your approval PIN"
      />
    </>
  )
}
