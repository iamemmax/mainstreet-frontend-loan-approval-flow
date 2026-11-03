import { Bell, CalendarClock, KeyRound, Palette, UserRound, type LucideIcon } from "lucide-react"
import type { Permission } from "@/lib/rbac/permissions"

export interface SettingsSection {
  id: "profile" | "security" | "delegation" | "notifications" | "appearance"
  label: string
  hint: string
  icon: LucideIcon
  /** Hidden for roles without it. */
  permission?: Permission
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile", hint: "Your details and access", icon: UserRound },
  { id: "security", label: "Security", hint: "Password and PIN", icon: KeyRound },
  {
    id: "delegation",
    label: "Out of office",
    hint: "Hand over your approvals",
    icon: CalendarClock,
    permission: "approval:delegate",
  },
  { id: "notifications", label: "Notifications", hint: "What reaches you, and how", icon: Bell },
  { id: "appearance", label: "Appearance", hint: "Light, dark or system", icon: Palette },
]
