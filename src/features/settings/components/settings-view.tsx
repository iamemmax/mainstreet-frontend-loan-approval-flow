"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { FORM_HEADER } from "@/components/shared/form-card"
import { useSession } from "@/features/auth/hooks/use-session"
import { can } from "@/lib/rbac/can"
import { takeIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import { AppearanceSection } from "./sections/appearance-section"
import { DelegationSection } from "./sections/delegation-section"
import { NotificationsSection } from "./sections/notifications-section"
import { ProfileSection } from "./sections/profile-section"
import { SecuritySection } from "./sections/security-section"
import { SETTINGS_SECTIONS, type SettingsSection } from "./sections"

const CONTENT: Record<SettingsSection["id"], () => React.ReactNode> = {
  profile: () => <ProfileSection />,
  security: () => <SecuritySection />,
  delegation: () => <DelegationSection />,
  notifications: () => <NotificationsSection />,
  appearance: () => <AppearanceSection />,
}

/** Personal settings for every staff member: a section menu on the left, the section on the right. */
export function SettingsView() {
  const session = useSession()
  const sections = SETTINGS_SECTIONS.filter((s) => !s.permission || can(session, s.permission))
  const [active, setActive] = useState<SettingsSection["id"]>(() => {
    const wanted = takeIntent("settingsSection")
    return sections.find((s) => s.id === wanted)?.id ?? "profile"
  })
  const current = sections.find((s) => s.id === active) ?? sections[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile, security and preferences. Bank-wide settings are under Administration."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)] lg:sticky lg:top-[6.5rem]"
        >
          <div className={cn(FORM_HEADER, "px-5")}>
            <span className="text-sm font-semibold">Settings</span>
            <span className="text-xs text-muted-foreground">{session.user.name}</span>
          </div>
          <ul className="grid gap-0.5 p-2.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {sections.map((s) => {
              const on = s.id === current.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={on ? "page" : undefined}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "bg-primary/[0.06]" : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <s.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{s.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div
          key={current.id}
          className="min-w-0 space-y-5 duration-300 ease-out animate-in fade-in slide-in-from-bottom-2"
        >
          {CONTENT[current.id]()}
        </div>
      </div>
    </div>
  )
}
