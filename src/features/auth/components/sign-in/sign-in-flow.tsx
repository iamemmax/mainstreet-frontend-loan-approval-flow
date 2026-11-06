"use client"

import { useState } from "react"
import { takeIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import type { User } from "../../types"
import { AccountStep } from "./account-step"
import { PasswordStep } from "./password-step"

const STEPS = [
  { id: "account", title: "Sign in", description: "Choose your staff account to continue." },
  { id: "password", title: "Enter your password", description: "Your sign-in password for this account." },
] as const

type Step = (typeof STEPS)[number]["id"]

/** Account, then password. The server checks the password before a session starts. */
export function SignInFlow() {
  const [next] = useState(() => takeIntent("afterSignIn"))
  // Only accept in-app paths, never an absolute URL.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined
  const [step, setStep] = useState<Step>("account")
  const [user, setUser] = useState<User | null>(null)
  const index = STEPS.findIndex((s) => s.id === step)
  const current = STEPS[index]

  const restart = () => setStep("account")

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i <= index ? "w-8 bg-primary" : "w-4 bg-muted",
              )}
            />
          ))}
        </div>
        <div key={current.id} className="space-y-1 duration-300 animate-in fade-in">
          <h2 className="text-2xl font-semibold tracking-tight">{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>
      </div>

      <div key={step} className="duration-300 ease-out animate-in fade-in slide-in-from-right-4">
        {step === "account" && (
          <AccountStep
            onSelect={(u) => {
              setUser(u)
              setStep("password")
            }}
          />
        )}
        {step === "password" && user && <PasswordStep user={user} next={safeNext} onBack={restart} />}
      </div>
    </div>
  )
}
