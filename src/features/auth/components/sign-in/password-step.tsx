"use client"

import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { PasswordInput } from "@/components/shared/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { useSignIn } from "../../hooks/use-auth-actions"
import type { User } from "../../types"
import { AccountChip } from "./account-chip"

/** Step 2: the account's password. Signs in when it's right. */
export function PasswordStep({
  user,
  next,
  onBack,
}: {
  user: User
  /** Where to go after signing in, if not the user's landing page. */
  next?: string
  onBack: () => void
}) {
  const [password, setPassword] = useState("")
  const signIn = useSignIn({ next })
  const wrong = isApiError(signIn.error) && signIn.error.code === "invalid_password" ? errorMessage(signIn.error) : null

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!password) return
        signIn.mutate({ userId: user.id, password })
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
            if (signIn.error) signIn.reset()
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
      <Button type="submit" className="h-11 w-full" disabled={!password || signIn.isPending}>
        {signIn.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Sign in <ArrowRight aria-hidden />
      </Button>
    </form>
  )
}
