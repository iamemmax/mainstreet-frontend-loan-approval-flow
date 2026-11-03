"use client"

import { Loader2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/api/errors"

interface ConfirmDialogProps {
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  tone?: "default" | "destructive"
  /** Irreversible actions: the user must type this text (e.g. the reference) to confirm. */
  confirmText?: string
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "default",
  confirmText,
  trigger,
  open: openProp,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = openProp ?? internalOpen

  const setOpen = (next: boolean) => {
    if (pending) return
    if (!next) {
      setTyped("")
      setError(null)
    }
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const confirm = async () => {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      setPending(false)
      setOpen(false)
    } catch (e) {
      setError(errorMessage(e))
      setPending(false)
    }
  }

  const blocked = confirmText !== undefined && typed.trim() !== confirmText

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText !== undefined && (
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono font-semibold">{confirmText}</span> to confirm
            </Label>
            <Input id="confirm-text" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {/* Plain button, not AlertDialogAction, so the dialog stays open until the action resolves. */}
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={confirm}
            disabled={pending || blocked}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
