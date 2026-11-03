"use client"

import { Bell, Mail, MessageSquare, Save } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AdminPage } from "./admin-page"

const CHANNELS = [
  { key: "inApp", label: "In-app", icon: Bell },
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
] as const
type Channel = (typeof CHANNELS)[number]["key"]

const EVENTS: { key: string; label: string; audience: string; defaults: Channel[] }[] = [
  {
    key: "approval_assigned",
    label: "Approval assigned",
    audience: "Approvers at the stage",
    defaults: ["inApp", "email"],
  },
  { key: "sla_reminder", label: "SLA reminder", audience: "Approvers at the stage", defaults: ["inApp", "email"] },
  {
    key: "sla_breached",
    label: "SLA breached",
    audience: "Approver and their manager",
    defaults: ["inApp", "email", "sms"],
  },
  { key: "auto_escalated", label: "Auto-escalated", audience: "Next stage approvers", defaults: ["inApp", "email"] },
  {
    key: "application_returned",
    label: "Application returned",
    audience: "Relationship officer",
    defaults: ["inApp", "email"],
  },
  { key: "info_requested", label: "More information requested", audience: "Relationship officer", defaults: ["inApp"] },
  { key: "offer_sent", label: "Offer sent", audience: "Customer", defaults: ["email", "sms"] },
  { key: "offer_accepted", label: "Offer accepted", audience: "Officer and finance", defaults: ["inApp", "email"] },
  { key: "message", label: "New message on an application", audience: "Staff who worked on it", defaults: ["inApp"] },
  {
    key: "application_rejected",
    label: "Application rejected",
    audience: "Relationship officer",
    defaults: ["inApp", "email"],
  },
  {
    key: "delegation",
    label: "Delegation started or ended",
    audience: "Delegator and delegate",
    defaults: ["inApp", "email"],
  },
]

export function NotificationsAdmin() {
  const initial = Object.fromEntries(EVENTS.map((e) => [e.key, new Set(e.defaults)]))
  const [settings, setSettings] = useState<Record<string, Set<Channel>>>(initial)
  const [dirty, setDirty] = useState(false)

  const toggle = (event: string, channel: Channel) => {
    setSettings((s) => {
      const next = new Set(s[event])
      if (next.has(channel)) next.delete(channel)
      else next.add(channel)
      return { ...s, [event]: next }
    })
    setDirty(true)
  }

  return (
    <AdminPage
      title="Notification settings"
      description="Which events notify whom, and on which channels. SMS and email are delivered through Yournotify."
      actions={
        <Button
          disabled={!dirty}
          onClick={() => {
            setDirty(false)
            toast.success("Notification settings saved")
          }}
        >
          <Save aria-hidden /> Save changes
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Event</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="w-24 px-2 py-3 text-center font-medium">
                  <span className="inline-flex items-center gap-1">
                    <c.icon className="size-3.5" aria-hidden />
                    {c.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {EVENTS.map((e) => (
              <tr key={e.key} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{e.label}</div>
                  <div className="text-xs text-muted-foreground">{e.audience}</div>
                </td>
                {CHANNELS.map((c) => (
                  <td key={c.key} className="px-2 py-3 text-center">
                    <Switch
                      checked={settings[e.key].has(c.key)}
                      onCheckedChange={() => toggle(e.key, c.key)}
                      aria-label={`${e.label} by ${c.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  )
}
