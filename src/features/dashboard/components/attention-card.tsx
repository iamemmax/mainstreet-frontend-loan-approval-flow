"use client"

import { BadgeCheck } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { TONE_TILE } from "@/components/shared/tone"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { setIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import { ALERT, type DashboardContext } from "./alerts"
import type { DashboardSummary } from "../schemas/dashboard"

export function AttentionCard({
  alerts,
  ctx,
  loading,
  className,
}: {
  alerts?: DashboardSummary["alerts"]
  ctx: DashboardContext
  loading: boolean
  className?: string
}) {
  const urgent = alerts?.some((a) => ALERT[a.key].tone === "danger")
  return (
    <Card className={cn("gap-0 pb-2", className)}>
      <CardHeader className="border-b">
        <CardTitle>Needs attention</CardTitle>
        <CardAction>
          {alerts && alerts.length > 0 && (
            <span
              className={cn(
                "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium",
                urgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
              )}
            >
              {alerts.length} {alerts.length === 1 ? "item" : "items"}
            </span>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-6">
        {loading || !alerts ? (
          <div className="space-y-4 py-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<BadgeCheck aria-hidden />}
            title="You're all caught up"
            description="Nothing in your area is overdue, flagged or about to expire."
          />
        ) : (
          <ul className="divide-y">
            {alerts.map((a) => {
              const def = ALERT[a.key]
              const link = def.link(ctx)
              return (
                <li key={a.key}>
                  <Link
                    href={link.href}
                    onClick={() => link.intent && setIntent("applications", link.intent)}
                    className="group flex items-start gap-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        TONE_TILE[def.tone],
                      )}
                    >
                      <def.icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                        {def.title(a.count)}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {a.examples.length ? (
                          <>
                            {a.examples.join(", ")}
                            {a.count > a.examples.length && "…"}{" "}
                            <span className="font-medium text-success">See all</span>
                          </>
                        ) : (
                          def.detail
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
