"use client"

import { CircleCheck, CircleDashed, Loader2, LogOut } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { FormCard } from "@/components/shared/form-card"
import { PinInput } from "@/components/shared/pin-input"
import { Button } from "@/components/ui/button"
import { useSignOut } from "@/features/auth/hooks/use-auth-actions"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { cn } from "@/lib/utils"
import { useChangePin } from "../../hooks/use-settings"
import { isWeakPin } from "../../schemas"
import { PasswordCard } from "./password-card"

const EMPTY = { currentPin: "", newPin: "", confirmPin: "" }

export function SecuritySection() {
  const [values, setValues] = useState(EMPTY)
  const change = useChangePin()
  const signOut = useSignOut()
  const { currentPin, newPin, confirmPin } = values
  // A wrong current PIN is shown here; anything else opens the error modal.
  const wrongPin = isApiError(change.error) && change.error.code === "invalid_pin" ? errorMessage(change.error) : null

  const rules = [
    { ok: newPin.length === 4, label: "4 digits" },
    { ok: newPin.length === 4 && !isWeakPin(newPin), label: "Not repeated digits or a straight run like 1234" },
    { ok: newPin.length === 4 && newPin !== currentPin, label: "Different from your current PIN" },
    { ok: confirmPin.length === 4 && confirmPin === newPin, label: "Both new PINs match" },
  ]
  const ready = currentPin.length === 4 && rules.every((r) => r.ok)

  const set = (key: keyof typeof EMPTY) => (v: string) => {
    if (change.error) change.reset()
    setValues((s) => ({ ...s, [key]: v }))
  }

  return (
    <>
      <PasswordCard />
      <FormCard
        title="Change PIN"
        description="Your PIN confirms approvals and every action that changes an application."
        footer={
          <Button
            disabled={!ready || change.isPending}
            onClick={() =>
              change.mutate(values, {
                onSuccess: () => {
                  setValues(EMPTY)
                  toast.success("PIN changed. Use your new PIN from now on.")
                },
                onError: () => setValues((s) => ({ ...s, currentPin: "" })),
              })
            }
          >
            {change.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Change PIN
          </Button>
        }
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="space-y-5">
            {(
              [
                ["currentPin", "Current PIN"],
                ["newPin", "New PIN"],
                ["confirmPin", "Confirm new PIN"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <div className="text-sm font-medium">{label}</div>
                <PinInput
                  value={values[key]}
                  onChange={set(key)}
                  invalid={key === "currentPin" && !!wrongPin}
                  disabled={change.isPending}
                  aria-label={label}
                />
                {key === "currentPin" && wrongPin && (
                  <p role="alert" className="text-[13px] font-medium text-destructive">
                    {wrongPin}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="self-start rounded-xl bg-muted/50 px-5 py-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Your new PIN
            </div>
            <ul className="mt-3 space-y-2.5">
              {rules.map((r) => (
                <li
                  key={r.label}
                  className={cn(
                    "flex items-start gap-2 text-sm transition-colors",
                    r.ok ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {r.ok ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  {r.label}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Three wrong PINs lock PIN-protected actions for 15 minutes. Never share your PIN, including with IT.
            </p>
          </div>
        </div>
      </FormCard>

      <FormCard
        title="This device"
        description="You're signed in here. Sign out when you're done on a shared computer."
        action={
          <Button variant="outline" onClick={() => signOut.mutate()}>
            <LogOut aria-hidden /> Sign out
          </Button>
        }
      />
    </>
  )
}
