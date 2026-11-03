"use client"

import { Loader2, ShieldCheck, type LucideIcon } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MODAL_CONTENT, ModalBody, ModalFacts, ModalFooter, ModalHeader, ModalNote } from "../modal"
import { PinPad } from "./pin-pad"
import { usePinEntry } from "./use-pin-entry"

export interface PinRequest {
  title: string
  description?: ReactNode
  /** Header icon; defaults to a shield. */
  icon?: LucideIcon
  /** What's being confirmed, shown above the PIN. */
  facts?: { label: string; value: ReactNode }[]
  warning?: string
  confirmLabel: string
  destructive?: boolean
  /** Not optimistic: the dialog waits for the server, which checks the PIN, before closing. */
  run: (pin: string) => Promise<unknown>
}

interface PinConfirmDialogProps {
  request: PinRequest | null
  onClose: () => void
}

export function PinConfirmDialog({ request, onClose }: PinConfirmDialogProps) {
  const entry = usePinEntry((pin) => request!.run(pin), onClose)
  const { reset } = entry

  useEffect(() => {
    if (request) reset()
  }, [request, reset])

  return (
    <Dialog open={!!request} onOpenChange={(next) => !next && !entry.submitting && onClose()}>
      <DialogContent className={MODAL_CONTENT}>
        {request && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void entry.submit()
            }}
            noValidate
          >
            <ModalHeader
              icon={request.icon ?? ShieldCheck}
              tone={request.destructive ? "danger" : "primary"}
              title={request.title}
              description={request.description}
            />
            <ModalBody>
              {request.facts?.length ? <ModalFacts items={request.facts} /> : null}
              {request.warning && <ModalNote tone="warning">{request.warning}</ModalNote>}
              <PinPad
                pin={entry.pin}
                onPinChange={entry.change}
                onComplete={(v) => void entry.submit(v)}
                error={entry.error}
                submitting={entry.submitting}
              />
            </ModalBody>
            <ModalFooter aside="Recorded in the audit trail">
              <Button type="button" variant="outline" disabled={entry.submitting} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={request.destructive ? "destructive" : "default"}
                disabled={entry.submitting || !entry.ready}
              >
                {entry.submitting && <Loader2 className="animate-spin" aria-hidden />}
                {request.confirmLabel}
              </Button>
            </ModalFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
