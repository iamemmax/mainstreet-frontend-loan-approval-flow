"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Check,
  Loader2,
  type LucideIcon,
  MessageSquareMore,
  RotateCcw,
  UserRoundCheck,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { decisionInputSchema } from "@/features/workflow/schemas/workflow"
import type { DecisionAction, DecisionInput } from "@/features/workflow/types"
import { cn } from "@/lib/utils"
import { MODAL_CONTENT, ModalBody, ModalFooter, ModalHeader, type ModalTone } from "../modal"
import { MoneyText } from "../money-text"
import { usePinEntry } from "../pin-confirm"
import { confirmLabel, dialogTitle, type CommitteeRule } from "./copy"
import { DetailsStep } from "./details-step"
import { PinStep } from "./pin-step"

const ACTION_HEAD: Record<DecisionAction, { icon: LucideIcon; tone: ModalTone }> = {
  approve: { icon: Check, tone: "success" },
  reject: { icon: Ban, tone: "danger" },
  return: { icon: RotateCcw, tone: "warning" },
  escalate: { icon: ArrowUpRight, tone: "primary" },
  request_info: { icon: MessageSquareMore, tone: "warning" },
}

export interface DecisionContext {
  reference: string
  applicantName: string
  amount: number
  stageName: string
  /** Set when the user is acting under a delegation. */
  onBehalfOfName?: string | null
}

interface DecisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The one decision this dialog records: the button the user pressed, nothing else. */
  action: DecisionAction
  context: DecisionContext
  /** Not optimistic: the dialog waits for the server, which checks the PIN, before closing. */
  onSubmit: (input: DecisionInput, pin: string) => Promise<void>
  /** At a committee stage approve and reject are votes, not final decisions. */
  committee?: CommitteeRule | null
}

/** Record an approval decision in two steps: the details, then the approver's PIN. */
export function DecisionDialog({ open, onOpenChange, action, context, onSubmit, committee }: DecisionDialogProps) {
  const [step, setStep] = useState<"details" | "pin">("details")
  const form = useForm<DecisionInput>({
    resolver: zodResolver(decisionInputSchema),
    defaultValues: { action, reasonCode: "", comment: "" },
  })
  const entry = usePinEntry(
    (pin) => onSubmit(form.getValues(), pin),
    () => onOpenChange(false),
  )
  const { reset } = entry

  // Start fresh each time the dialog opens, never while it's open.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      form.reset({ action, reasonCode: "", comment: "" })
      setStep("details")
      reset()
    }
    wasOpen.current = open
  }, [open, action, form, reset])

  const toPin = form.handleSubmit(() => {
    setStep("pin")
    entry.setError(null)
  })

  const head = ACTION_HEAD[action]
  return (
    <Dialog open={open} onOpenChange={(next) => !entry.submitting && onOpenChange(next)}>
      <DialogContent className={cn(MODAL_CONTENT, "sm:max-w-[520px]")}>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (step === "details") void toPin()
              else void entry.submit()
            }}
            noValidate
          >
            <ModalHeader
              icon={head.icon}
              tone={head.tone}
              step={{ current: step === "details" ? 1 : 2, total: 2 }}
              title={step === "pin" ? "Confirm with your PIN" : dialogTitle(action, committee)}
              description={
                step === "pin" ? "Check the decision, then enter your PIN to sign it." : `${context.stageName} stage`
              }
              meta={[
                <span key="ref" className="font-mono">
                  {context.reference}
                </span>,
                context.applicantName,
                <MoneyText key="amt" value={context.amount} />,
              ]}
            />
            <ModalBody>
              {context.onBehalfOfName && step === "details" && (
                <p className="flex items-center gap-2 rounded-xl bg-primary/[0.06] px-3.5 py-2.5 text-[13px] text-primary">
                  <UserRoundCheck className="size-4 shrink-0" aria-hidden />
                  Deciding on behalf of {context.onBehalfOfName} under an active delegation.
                </p>
              )}
              {step === "details" ? (
                <DetailsStep form={form} action={action} committee={committee} />
              ) : (
                <PinStep
                  decision={form.getValues()}
                  pin={entry.pin}
                  onPinChange={entry.change}
                  onComplete={(v) => void entry.submit(v)}
                  error={entry.error}
                  submitting={entry.submitting}
                  committee={committee}
                />
              )}
            </ModalBody>
            <ModalFooter aside={step === "pin" ? "Recorded in the audit trail" : undefined}>
              {step === "pin" ? (
                <Button type="button" variant="outline" disabled={entry.submitting} onClick={() => setStep("details")}>
                  <ArrowLeft aria-hidden /> Back
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant={action === "reject" ? "destructive" : "default"}
                disabled={entry.submitting || (step === "pin" && !entry.ready)}
              >
                {entry.submitting && <Loader2 className="animate-spin" aria-hidden />}
                {step === "pin" ? confirmLabel(action, committee) : "Continue"}
              </Button>
            </ModalFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
