"use client"

import { isToday, isYesterday } from "date-fns"
import { Bell, CheckCheck, Settings, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { EmptyState, ErrorState } from "@/components/shared/empty-state"
import { SegmentedControl } from "@/components/shared/segmented-control"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useMarkNotificationsRead, useNotifications } from "@/features/notifications/hooks/use-notifications"
import type { Notification } from "@/features/notifications/types"
import { formatRelative } from "@/lib/format/date"
import { setIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import { HEADER_ICON_BUTTON } from "./header-styles"
import { KIND_META } from "./notification-meta"

type View = "all" | "unread"

/** Today, Yesterday, then Earlier: the order people scan in. */
function groupByDay(items: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = []
  for (const n of items) {
    const d = new Date(n.createdAt)
    const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : "Earlier"
    const last = groups.at(-1)
    if (last?.label === label) last.items.push(n)
    else groups.push({ label, items: [n] })
  }
  return groups
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>("all")
  const router = useRouter()
  const { data, isPending, error, refetch } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const unread = data?.unread ?? 0
  const items = (data?.items ?? []).filter((n) => view === "all" || !n.readAt)

  const go = (n: Notification) => {
    if (!n.readAt) markRead.mutate([n.id])
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", HEADER_ICON_BUTTON)}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span className="tabular absolute top-1.5 right-1.5 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-card">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 space-y-3 border-b px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-[15px]">Notifications</SheetTitle>
              {unread > 0 && (
                <span className="tabular rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={unread === 0 || markRead.isPending}
                onClick={() => markRead.mutate("all")}
              >
                <CheckCheck aria-hidden /> Mark all read
              </Button>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Close notifications">
                  <X aria-hidden />
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Approvals, SLA alerts, messages and returns for your work.
          </SheetDescription>
          <SegmentedControl
            aria-label="Show"
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: `Unread${unread ? ` (${unread})` : ""}` },
            ]}
          />
        </div>

        {/* The only part that scrolls; header and footer stay put. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {isPending ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState size="sm" error={error} onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Bell aria-hidden />}
              title={view === "unread" ? "No unread notifications" : "You're all caught up"}
              description="New approvals, SLA alerts, messages and returns will show here."
            />
          ) : (
            groupByDay(items).map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h3 className="sticky top-0 z-10 border-b bg-background/95 px-4 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase backdrop-blur">
                  {g.label}
                </h3>
                <ul>
                  {g.items.map((n) => {
                    const meta = KIND_META[n.kind]
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => go(n)}
                          className={cn(
                            "relative flex w-full gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50",
                            !n.readAt && "bg-primary/[0.025]",
                          )}
                        >
                          {!n.readAt && (
                            <span aria-hidden className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-primary" />
                          )}
                          <span
                            className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", meta.tile)}
                          >
                            <meta.icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span
                                className={cn(
                                  "text-[13px] leading-snug",
                                  n.readAt ? "text-foreground/80" : "font-semibold",
                                )}
                              >
                                {n.title}
                              </span>
                              <span className="shrink-0 pt-px text-[11px] text-muted-foreground">
                                {formatRelative(n.createdAt)}
                              </span>
                            </span>
                            <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                          </span>
                          {!n.readAt && <span className="sr-only">Unread</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t bg-muted/30 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {data ? `${data.items.length} notification${data.items.length === 1 ? "" : "s"}` : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setOpen(false)
              setIntent("settingsSection", "notifications")
              router.push("/settings")
            }}
          >
            <Settings aria-hidden /> Preferences
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
