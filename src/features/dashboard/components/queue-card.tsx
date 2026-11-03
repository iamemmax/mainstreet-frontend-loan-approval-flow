"use client"

import { ArrowRight, BadgeCheck } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { SLABadge, ToneBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount } from "@/lib/format/money"
import { setIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import type { DashboardFocus, DashboardSummary, QueueAction } from "../schemas/dashboard"
import { formatDays } from "./figures"

const ACTION: Record<QueueAction, { label: string; tab: string }> = {
  finish_draft: { label: "Finish draft", tab: "overview" },
  fix_return: { label: "Fix and resubmit", tab: "activity" },
  start_verification: { label: "Start verification", tab: "verification" },
  run_checks: { label: "Run checks", tab: "verification" },
  complete_verification: { label: "Complete verification", tab: "verification" },
  assess: { label: "Assess", tab: "assessment" },
  decide: { label: "Decide", tab: "workflow" },
  send_offer: { label: "Send offer", tab: "offer" },
  chase_offer: { label: "Follow up", tab: "offer" },
  hand_over: { label: "Hand over", tab: "offer" },
}

const EMPTY: Record<DashboardFocus, string> = {
  origination: "No drafts, returns or offers need you right now.",
  verification: "No applications are waiting for verification.",
  assessment: "No applications are waiting for assessment or your decision.",
  approval: "No decisions are waiting on you.",
  finance: "No accepted loans are waiting for handover.",
  oversight: "No decisions are waiting on you.",
}

/** Days after which a step without an SLA is shown as slow. */
const SLOW_DAYS = 2

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
    <Card className={cn("gap-0 pb-2", className)}>
      <CardHeader className="border-b">
        <CardTitle>Waiting on you</CardTitle>
        <CardAction>
          {queue && queue.total > 0 && (
            <span className="tabular inline-flex h-7 items-center rounded-full bg-muted px-3 text-[13px] font-medium text-muted-foreground">
              {formatCount(queue.total)} {queue.total === 1 ? "item" : "items"}
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
          <>
            {/* One shared grid so badges and buttons line up across rows, whatever their text. */}
            <ul className="divide-y sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4">
              {queue.items.map((i) => {
                const action = ACTION[i.action]
                const days = (now - Date.parse(i.since)) / 86_400_000
                return (
                  <li
                    key={`${i.id}-${i.action}`}
                    className="flex flex-col gap-3 py-3.5 sm:col-span-3 sm:grid sm:grid-cols-subgrid sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link href={`/applications/${i.id}`} className="truncate font-semibold hover:underline">
                          {i.applicantName}
                        </Link>
                        <MoneyText
                          value={i.amountRequested}
                          format="compact"
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono">{i.reference}</span>
                        <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
                        <span>{i.action === "decide" && i.currentStageName ? i.currentStageName : i.productName}</span>
                        {i.onBehalfOfName && (
                          <>
                            <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
                            <span>For {i.onBehalfOfName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:contents">
                      {i.sla ? (
                        <SLABadge state={i.sla.state} dueAt={i.sla.dueAt} className="sm:justify-self-start" />
                      ) : (
                        <ToneBadge
                          tone={days >= SLOW_DAYS ? "warning" : "neutral"}
                          className="tabular sm:justify-self-start"
                        >
                          Waiting {formatDays(days)}
                        </ToneBadge>
                      )}
                      <Button
                        size="sm"
                        variant={i.sla?.state === "breached" ? "default" : "outline"}
                        className="sm:w-full sm:justify-between"
                        asChild
                      >
                        <Link href={`/applications/${i.id}`} onClick={() => setIntent("applicationTab", action.tab)}>
                          {action.label} <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
            {queue.total > queue.items.length && (
              <p className="border-t py-3 text-sm text-muted-foreground">
                Showing the {queue.items.length} most urgent of {formatCount(queue.total)}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
