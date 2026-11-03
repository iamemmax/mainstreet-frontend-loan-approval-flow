"use client"

import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { PasswordInput } from "@/components/shared/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { useCheckPassword } from "../../hooks/use-auth-actions"
import type { User } from "../../types"
import { AccountChip } from "./account-chip"

/** Step 2: the account's password. Checked before the PIN is asked for. */
export function PasswordStep({
  user,
  onBack,
  onNext,
}: {
  user: User
  onBack: () => void
  onNext: (password: string) => void
}) {
  const [password, setPassword] = useState("")
  const check = useCheckPassword()
  const wrong = isApiError(check.error) && check.error.code === "invalid_password" ? errorMessage(check.error) : null

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!password) return
        check.mutate({ userId: user.id, password }, { onSuccess: () => onNext(password) })
      }}
    >
      <AccountChip user={user} onChange={onBack} />
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <span className="text-xs text-muted-foreground">Forgot it? Ask your system administrator.</span>
        </div>
        <PasswordInput
          id="signin-password"
          label="Password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => {
            if (check.error) check.reset()
            setPassword(e.target.value)
          }}
          aria-invalid={!!wrong}
        />
        {wrong && (
          <p role="alert" className="text-[13px] font-medium text-destructive">
            {wrong}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full" disabled={!password || check.isPending}>
        {check.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Continue <ArrowRight aria-hidden />
      </Button>
    </form>
  )
}
