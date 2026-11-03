"use client"

import { Loader2, LockKeyhole } from "lucide-react"
import { useState } from "react"
import { PinInput } from "@/components/shared/pin-input"
import { Button } from "@/components/ui/button"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { useSignIn } from "../../hooks/use-auth-actions"
import type { User } from "../../types"
import { AccountChip } from "./account-chip"

const PIN_LENGTH = 4

/** Step 3: the PIN, as a second factor. Signs in as soon as the last digit is entered. */
export function PinStep({
  user,
  password,
  next,
  onBack,
}: {
  user: User
  password: string
  next?: string
  onBack: () => void
}) {
  const [pin, setPin] = useState("")
  const signIn = useSignIn({ next })
  const wrong = isApiError(signIn.error) && signIn.error.code === "invalid_pin" ? errorMessage(signIn.error) : null

  const submit = (value: string) => {
    if (value.length !== PIN_LENGTH || signIn.isPending) return
    signIn.mutate({ userId: user.id, password, pin: value }, { onError: () => setPin("") })
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit(pin)
      }}
    >
      <AccountChip user={user} onChange={onBack} />
      <div className="space-y-3 rounded-2xl border bg-card px-5 py-6 text-center shadow-xs">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/[0.08] text-primary">
          <LockKeyhole className="size-5" aria-hidden />
        </span>
        <div>
          <div className="font-semibold">Enter your PIN</div>
          <p className="text-sm text-muted-foreground">The same 4-digit PIN you use to confirm approvals.</p>
        </div>
        <div className="mx-auto max-w-[17rem] pt-1">
          <PinInput
            value={pin}
            onChange={(v) => {
              if (signIn.error) signIn.reset()
              setPin(v)
            }}
            onComplete={submit}
            invalid={!!wrong}
            disabled={signIn.isPending}
            autoFocus
            aria-label="PIN"
          />
        </div>
        {wrong ? (
          <p role="alert" className="text-[13px] font-medium text-destructive">
            {wrong}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Three wrong PINs lock your account for 15 minutes.</p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full" disabled={pin.length !== PIN_LENGTH || signIn.isPending}>
        {signIn.isPending && <Loader2 className="animate-spin" aria-hidden />}
        Sign in
      </Button>
    </form>
  )
}
