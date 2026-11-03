"use client"

import { Bell, Check, Loader2, Lock, Mail, MessageSquareText, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { FormCard } from "@/components/shared/form-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CHANNEL_LABELS, DEFAULT_NOTIFICATION_PREFS, PERSONAL_EVENTS, type PersonalEvent } from "../../constants"
import { useNotificationPrefs, useSaveNotificationPrefs } from "../../hooks/use-settings"
import { NOTIFICATION_CHANNELS } from "../../schemas"
import type { NotificationChannel, NotificationPrefs } from "../../types"

const CHANNEL_ICON: Record<NotificationChannel, LucideIcon> = { inApp: Bell, email: Mail, sms: MessageSquareText }

export function NotificationsSection() {
  const { data } = useNotificationPrefs()
  if (!data) return <Skeleton className="h-[32rem] w-full rounded-2xl" />
  return <NotificationsForm saved={data} />
}

const key = (p: NotificationPrefs) =>
  JSON.stringify(
    Object.entries(p)
      .map(([k, v]) => [k, [...(v ?? [])].sort()])
      .sort(),
  )

function NotificationsForm({ saved }: { saved: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(saved)
  const save = useSaveNotificationPrefs()
  const dirty = key(prefs) !== key(saved)

  const toggle = (kind: PersonalEvent["kind"], channel: NotificationChannel) =>
    setPrefs((p) => {
      const current = p[kind] ?? []
      return { ...p, [kind]: current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel] }
    })

  return (
    <FormCard
      title="Notifications"
      description="Choose how each update reaches you. Keep SMS for what can't wait."
      bodyClassName="p-0"
      footer={
        <>
          {dirty && <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>}
          <Button variant="ghost" onClick={() => setPrefs(DEFAULT_NOTIFICATION_PREFS)} disabled={save.isPending}>
            Reset to defaults
          </Button>
          <Button
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate(prefs, { onSuccess: () => toast.success("Notification preferences saved") })}
          >
            {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Save changes
          </Button>
        </>
      }
    >
      {PERSONAL_EVENTS.map((g) => (
        <section key={g.group} aria-label={g.group} className="border-b last:border-b-0">
          <h3 className="bg-muted/30 px-6 py-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {g.group}
          </h3>
          <ul className="divide-y divide-border/60">
            {g.events.map((e) => (
              <li key={e.kind} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{e.label}</div>
                  <div className="text-[13px] text-muted-foreground">{e.hint}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  {NOTIFICATION_CHANNELS.map((c) => (
                    <ChannelChip
                      key={c}
                      channel={c}
                      on={!!prefs[e.kind]?.includes(c)}
                      locked={!!e.required && c === "inApp"}
                      onToggle={() => toggle(e.kind, c)}
                      event={e.label}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </FormCard>
  )
}

/** One channel for one event: a pill that reads on or off at a glance. */
function ChannelChip({
  channel,
  on,
  locked,
  onToggle,
  event,
}: {
  channel: NotificationChannel
  on: boolean
  locked: boolean
  onToggle: () => void
  event: string
}) {
  const Icon = CHANNEL_ICON[channel]
  const active = on || locked
  const chip = (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${event} by ${CHANNEL_LABELS[channel]}`}
      disabled={locked}
      onClick={onToggle}
      className={cn(
        // Fixed width with a reserved status slot, so chips line up in columns down the list.
        "inline-flex h-8 w-full items-center gap-1.5 rounded-full border pr-2.5 pl-3 text-xs font-medium whitespace-nowrap sm:w-[6.75rem] transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
        active
          ? "border-primary/25 bg-primary/[0.07] text-primary"
          : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="flex-1 text-left">{CHANNEL_LABELS[channel]}</span>
      {locked ? (
        <Lock className="size-3" aria-hidden />
      ) : (
        <Check
          className={cn(
            "size-3.5 transition-all duration-200",
            active ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
          strokeWidth={3}
          aria-hidden
        />
      )}
    </button>
  )
  if (!locked) return chip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block sm:inline-block">{chip}</span>
      </TooltipTrigger>
      <TooltipContent>Always on, so approvals don&apos;t go overdue unnoticed</TooltipContent>
    </Tooltip>
  )
}
