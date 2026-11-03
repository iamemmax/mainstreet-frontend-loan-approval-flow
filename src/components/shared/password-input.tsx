"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & { label: string }

/** A password field with a show/hide button. `label` names the button for screen readers. */
export function PasswordInput({ label, className, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
