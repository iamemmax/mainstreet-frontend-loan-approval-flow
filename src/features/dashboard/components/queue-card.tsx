"use client"

import { ArrowRight, BadgeCheck } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { DashboardFocus, DashboardSummary, QueueAction, QueueItem } from "../schemas/dashboard"
import { isOverdue, QUEUE_ACTION, QueueRow } from "./queue-row"

const EMPTY: Record<DashboardFocus, string> = {
  origination: "No drafts, returns or offers need you right now.",
  verification: "No applications are waiting for verification.",
  assessment: "No applications are waiting for assessment or your decision.",
  approval: "No decisions are waiting on you.",
  finance: "No accepted loans are waiting for handover.",
  oversight: "No decisions are waiting on you.",
}

/** Where "View all" goes: the page that lists every task of this kind. */
const VIEW_ALL: Record<DashboardFocus, string> = {
  origination: "/applications",
  verification: "/applications",
  assessment: "/applications",
  approval: "/my-work",
  finance: "/handover",
  oversight: "/my-work",
}

/** The tasks grouped by what needs doing, each group in the order its most urgent task appears. */
function groupByAction(items: QueueItem[]): { action: QueueAction; items: QueueItem[] }[] {
  const groups: { action: QueueAction; items: QueueItem[] }[] = []
  for (const item of items) {
    const group = groups.find((g) => g.action === item.action)
    if (group) group.items.push(item)
    else groups.push({ action: item.action, items: [item] })
  }
  return groups
}

/** One kind of task: what to do and why, how many and how many are overdue, then each one. */
function QueueGroup({ action, items, now }: { action: QueueAction; items: QueueItem[]; now: number }) {
  const { label, hint, icon: Icon } = QUEUE_ACTION[action]
  const overdue = items.filter((item) => isOverdue(item, now)).length
  return (
    <section aria-label={label} className="py-3">
      <div className="mb-1.5 flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-border/70">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {overdue > 0 && (
            <span className="tabular rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {overdue} overdue
            </span>
          )}
          <span className="tabular rounded-full bg-card px-2 py-0.5 text-xs font-semibold ring-1 ring-border/70">
            {items.length}
          </span>
        </div>
      </div>
      <ul>
        {items.map((item) => (
          <QueueRow key={`${item.id}-${item.action}`} item={item} now={now} />
        ))}
      </ul>
    </section>
  )
}

/** The tasks waiting on the signed-in user, most urgent first, grouped by what needs doing. */
export function QueueCard({
  queue,
  focus,
  loading,
  className,
}: {
  queue?: DashboardSummary["queue"]
  focus?: DashboardFocus
  loading: boolean
  className?: string
}) {
  const now = Date.now()
  return (
    <Card className={cn("gap-0 pb-0", className)}>
      <CardHeader className="border-b">
        <CardTitle>Waiting on you</CardTitle>
        <CardDescription>Most urgent first. Open one to pick it up.</CardDescription>
        <CardAction>
          {queue && queue.total > 0 && (
            <span className="tabular inline-flex h-7 items-center rounded-full bg-primary/[0.08] px-3 text-[13px] font-semibold text-primary">
              {formatCount(queue.total)} {queue.total === 1 ? "task" : "tasks"}
            </span>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-6">
        {loading || !queue || !focus ? (
          <div className="space-y-4 py-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : queue.items.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<BadgeCheck aria-hidden />}
            title="You're all caught up"
            description={EMPTY[focus]}
          />
        ) : (
          <div>
            {groupByAction(queue.items).map((group) => (
              <QueueGroup key={group.action} action={group.action} items={group.items} now={now} />
            ))}
          </div>
        )}
      </CardContent>
      {queue && focus && queue.items.length > 0 && (
        <div className="mt-2 flex items-center justify-between gap-3 border-t px-6 py-3 text-sm">
          <span className="text-muted-foreground">
            {queue.total > queue.items.length
              ? `Showing the ${queue.items.length} most urgent of ${formatCount(queue.total)}`
              : "That's everything waiting on you"}
          </span>
          <Link
            href={VIEW_ALL[focus]}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </Card>
  )
}
