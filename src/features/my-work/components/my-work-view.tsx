"use client"

import { CircleCheck } from "lucide-react"
import { useState } from "react"
import { EmptyState, ErrorState } from "@/components/shared/empty-state"
import { MoneyText } from "@/components/shared/money-text"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard, StatMeta } from "@/components/shared/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyWork } from "@/features/applications/hooks/use-applications"
import { useSession } from "@/features/auth/hooks/use-session"
import { formatCount } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { EMPTY, type Tab, TAB_META, TABS } from "./constants"
import { DelegationBanner } from "./delegation-banner"
import { QueueTable } from "./queue-table"

export function MyWorkView() {
  const { user } = useSession()
  const [tab, setTab] = useState<Tab>("pending")
  const { data, isPending, error, refetch } = useMyWork()

  return (
    <div className="space-y-6">
      <PageHeader title="My work" description="Applications waiting for your decision, most urgent first." />
      <DelegationBanner userId={user.id} />

      <section aria-label="Queue summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting my decision"
          loading={isPending}
          value={data && formatCount(data.pending.length)}
          hint={
            data && (
              <StatMeta
                parts={[
                  `${formatCount(data.pending.filter((i) => i.sla?.state === "due_soon").length)} due soon`,
                  <MoneyText
                    key="v"
                    value={data.pending.reduce((t, i) => t + i.amountRequested, 0)}
                    format="compact"
                  />,
                ]}
              />
            )
          }
        />
        <StatCard
          label="Delegated to me"
          loading={isPending}
          value={data && formatCount(data.delegated.length)}
          hint={
            data &&
            (data.delegated[0]?.onBehalfOfName
              ? `On behalf of ${data.delegated[0].onBehalfOfName}`
              : "No active delegation")
          }
        />
        <StatCard
          label="Returned to me"
          tone={data?.returned.length ? "warning" : "neutral"}
          loading={isPending}
          value={data && formatCount(data.returned.length)}
          hint={data && (data.returned.length ? "Correct and resubmit" : "Nothing to correct")}
        />
        <StatCard
          label="Overdue"
          tone={data?.overdue.length ? "danger" : "neutral"}
          loading={isPending}
          value={data && formatCount(data.overdue.length)}
          hint={data && (data.overdue.length ? "Past SLA — act first" : "All within SLA")}
        />
      </section>

      <section
        aria-labelledby="queue-title"
        className="rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]"
      >
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 id="queue-title" className="text-[17px] font-semibold tracking-tight">
              {TAB_META[tab].title}
            </h2>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {data
                ? `${formatCount(data[tab].length)} ${data[tab].length === 1 ? "application" : "applications"}`
                : "Loading…"}
              <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
              {TAB_META[tab].hint}
            </p>
          </div>
          <div role="tablist" aria-label="Queues" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {TABS.map((t) => {
              const selected = t === tab
              const count = data?.[t].length ?? 0
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={selected}
                  aria-controls="queue-panel"
                  onClick={() => setTab(t)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full pr-1.5 pl-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                    !data && "pr-4",
                  )}
                >
                  {TAB_META[t].label}
                  {data && (
                    <span
                      className={cn(
                        "tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        t === "overdue" && count > 0
                          ? "bg-destructive text-white"
                          : selected
                            ? "bg-white/20 text-primary-foreground"
                            : "bg-background text-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        <div id="queue-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="p-3 sm:p-5">
          {error ? (
            <ErrorState error={error} onRetry={() => refetch()} size="sm" />
          ) : isPending || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : data[tab].length === 0 ? (
            <EmptyState size="sm" icon={<CircleCheck aria-hidden />} {...EMPTY[tab]} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80">
              <QueueTable items={data[tab]} showStatus={tab === "returned"} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
