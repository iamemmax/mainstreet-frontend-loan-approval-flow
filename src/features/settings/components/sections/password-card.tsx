"use client"

import { CircleCheck, CircleDashed, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { FormCard } from "@/components/shared/form-card"
import { PasswordInput } from "@/components/shared/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { formatRelative } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import { useChangePassword, usePasswordStatus } from "../../hooks/use-settings"
import { PASSWORD_RULES } from "../../schemas"

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" }

const STRENGTH = [
  { label: "Too weak", bar: "bg-destructive" },
  { label: "Weak", bar: "bg-destructive" },
  { label: "Fair", bar: "bg-warning" },
  { label: "Good", bar: "bg-success" },
  { label: "Strong", bar: "bg-success" },
] as const

function PasswordField({
  id,
  label,
  value,
  onChange,
  invalid,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  autoComplete: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        label={label}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
    </div>
  )
}

/** Change the sign-in password: current password, a strength meter and a live checklist. */
export function PasswordCard() {
  const [values, setValues] = useState(EMPTY)
  const change = useChangePassword()
  const { data: status } = usePasswordStatus()
  const { currentPassword, newPassword, confirmPassword } = values
  const wrong = isApiError(change.error) && change.error.code === "invalid_password" ? errorMessage(change.error) : null

  const passed = PASSWORD_RULES.filter((r) => r.test(newPassword)).length
  const rules = [
    ...PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(newPassword) })),
    { label: "Different from your current password", ok: newPassword.length > 0 && newPassword !== currentPassword },
    { label: "Both new passwords match", ok: confirmPassword.length > 0 && confirmPassword === newPassword },
  ]
  const ready = currentPassword.length > 0 && rules.every((r) => r.ok)
  const strength = STRENGTH[newPassword ? passed : 0]

  const set = (key: keyof typeof EMPTY) => (v: string) => {
    if (change.error) change.reset()
    setValues((s) => ({ ...s, [key]: v }))
  }

  return (
    <FormCard
      title="Password"
      description={
        status?.changedAt
          ? `Last changed ${formatRelative(status.changedAt)}.`
          : "You're still using the password you were given. Change it to one only you know."
      }
      footer={
        <Button
          disabled={!ready || change.isPending}
          onClick={() =>
            change.mutate(values, {
              onSuccess: () => {
                setValues(EMPTY)
                toast.success("Password changed. Use it the next time you sign in.")
              },
            })
          }
        >
          {change.isPending && <Loader2 className="animate-spin" aria-hidden />}
          Change password
        </Button>
      }
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <PasswordField
              id="pw-current"
              label="Current password"
              value={currentPassword}
              onChange={set("currentPassword")}
              invalid={!!wrong}
              autoComplete="current-password"
            />
            {wrong && (
              <p role="alert" className="text-[13px] font-medium text-destructive">
                {wrong}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <PasswordField
              id="pw-new"
              label="New password"
              value={newPassword}
              onChange={set("newPassword")}
              autoComplete="new-password"
            />
            <div className="flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden>
                {PASSWORD_RULES.map((r, i) => (
                  <span
                    key={r.id}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      newPassword && i < passed ? strength.bar : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-xs font-medium text-muted-foreground">
                {newPassword ? strength.label : ""}
              </span>
            </div>
          </div>
          <PasswordField
            id="pw-confirm"
            label="Confirm new password"
            value={confirmPassword}
            onChange={set("confirmPassword")}
            autoComplete="new-password"
          />
        </div>
        <div className="self-start rounded-xl bg-muted/50 px-5 py-4">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Your new password
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
            Don&apos;t use your name or email, and don&apos;t reuse a password from another site.
          </p>
        </div>
      </div>
    </FormCard>
  )
}
