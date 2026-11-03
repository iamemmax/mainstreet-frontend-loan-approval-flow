import type { NotificationKind } from "@/features/notifications/types"
import type { NotificationChannel, NotificationPrefs } from "./types"

export const CHANNEL_LABELS: Record<NotificationChannel, string> = { inApp: "In-app", email: "Email", sms: "SMS" }

export interface PersonalEvent {
  kind: NotificationKind
  label: string
  hint: string
  /** In-app can't be switched off for these: missing one risks a breached SLA. */
  required?: boolean
}

/** Events a staff member can tune for themselves, grouped as they appear on the page. */
export const PERSONAL_EVENTS: { group: string; events: PersonalEvent[] }[] = [
  {
    group: "Approvals",
    events: [
      {
        kind: "approval_assigned",
        label: "Approval waiting on me",
        hint: "An application reaches a stage I can decide",
        required: true,
      },
      { kind: "sla_reminder", label: "SLA reminder", hint: "Before an approval passes its time limit" },
      { kind: "sla_breached", label: "SLA breached", hint: "An approval I hold is overdue", required: true },
      { kind: "auto_escalated", label: "Auto-escalated", hint: "An overdue approval moved up a level" },
    ],
  },
  {
    group: "My applications",
    events: [
      { kind: "application_returned", label: "Returned for correction", hint: "An approver sent one of my files back" },
      { kind: "info_requested", label: "More information requested", hint: "An approver needs something from me" },
      { kind: "application_rejected", label: "Application rejected", hint: "One of my files was rejected" },
      { kind: "offer_accepted", label: "Offer accepted", hint: "A customer accepted their offer" },
    ],
  },
  {
    group: "Team",
    events: [
      { kind: "message", label: "New message", hint: "Someone posts on an application I worked on" },
      { kind: "delegation", label: "Delegation", hint: "Someone delegates their approvals to me, or it ends" },
    ],
  },
]

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  approval_assigned: ["inApp", "email"],
  sla_reminder: ["inApp", "email"],
  sla_breached: ["inApp", "email", "sms"],
  auto_escalated: ["inApp", "email"],
  application_returned: ["inApp", "email"],
  info_requested: ["inApp"],
  application_rejected: ["inApp", "email"],
  offer_accepted: ["inApp", "email"],
  message: ["inApp"],
  delegation: ["inApp", "email"],
}

/** The longest a delegation may run without an administrator. */
export const MAX_DELEGATION_DAYS = 30
