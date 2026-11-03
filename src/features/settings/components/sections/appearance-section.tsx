"use client"

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { FormCard } from "@/components/shared/form-card"
import { cn } from "@/lib/utils"

const THEMES: { id: "light" | "dark" | "system"; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", hint: "Bright and clear", icon: Sun },
  { id: "dark", label: "Dark", hint: "Easier in low light", icon: Moon },
  { id: "system", label: "System", hint: "Follow this device", icon: Monitor },
]

/** A miniature of the app in each theme, so the choice is visual. Brand hexes on purpose: it previews both themes at once. */
function Preview({ dark }: { dark: boolean }) {
  return (
    <div
      className={cn(
        "flex h-24 overflow-hidden rounded-lg border",
        dark ? "border-white/10 bg-[#121015]" : "border-black/5 bg-[#f6f4f7]",
      )}
    >
      <div className="w-1/4 bg-[#1b081b] p-1.5">
        <div className="mb-1.5 size-2.5 rounded-sm bg-[#c9f26b]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("mb-1 h-1 rounded-full", i === 0 ? "bg-white/60" : "bg-white/25")} />
        ))}
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <div className={cn("h-1.5 w-1/2 rounded-full", dark ? "bg-white/50" : "bg-[#1c1a1f]/60")} />
        <div className={cn("h-10 rounded-md", dark ? "bg-white/[0.06]" : "bg-white shadow-xs")} />
        <div className="flex gap-1">
          <div className={cn("h-3 flex-1 rounded", dark ? "bg-white/[0.06]" : "bg-white shadow-xs")} />
          <div className={cn("h-3 w-6 rounded", dark ? "bg-[#bd64af]" : "bg-[#7c1f74]")} />
        </div>
      </div>
    </div>
  )
}

export function AppearanceSection() {
  const { theme, setTheme, systemTheme } = useTheme()
  // The theme is only known in the browser; render the choice after mount to avoid a mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <FormCard title="Appearance" description="Applies to this browser only.">
      <div role="radiogroup" aria-label="Theme" className="grid gap-4 sm:grid-cols-3">
        {THEMES.map((t) => {
          const on = mounted && theme === t.id
          const dark = t.id === "dark" || (t.id === "system" && systemTheme === "dark")
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(t.id)}
              className={cn(
                "group space-y-3 rounded-2xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary ring-4 ring-primary/10" : "hover:border-foreground/25",
              )}
            >
              <Preview dark={dark} />
              <div className="flex items-center gap-2.5 px-1">
                <t.icon className="size-4 text-muted-foreground" aria-hidden />
                <div className="flex-1">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </div>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </FormCard>
  )
}
