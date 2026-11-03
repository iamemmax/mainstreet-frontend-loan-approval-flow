"use client"

import { ChartColumn, FilePlus, FileText, Inbox, Landmark, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { ErrorState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSession } from "@/features/auth/hooks/use-session"
import { formatDate } from "@/lib/format/date"
import { type ListIntent, setIntent } from "@/lib/navigation/intent"
import type { Permission } from "@/lib/rbac/permissions"
import { cn } from "@/lib/utils"
import { useDashboardSummary } from "../hooks/use-dashboard"
import type { DashboardFocus } from "../schemas/dashboard"
import { AttentionCard } from "./attention-card"
import { FigureRow } from "./figure-row"
import { QueueCard } from "./queue-card"
import { StageAgingCard } from "./stage-aging-card"
import { VolumeCard } from "./volume-card"

function greeting(now: Date) {
  const h = now.getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

const DESCRIPTION: Record<DashboardFocus, string> = {
  origination: "Your applications, returns and offers at a glance.",
  verification: "Applications waiting for identity, bureau and screening checks.",
  assessment: "Applications waiting for credit assessment and your decision.",
  approval: "Decisions waiting on you and how close they are to SLA.",
  finance: "Accepted loans to hand over for disbursement.",
  oversight: "Where the loan book stands and where it is slowing down.",
}

/** The one thing each team most often starts from the dashboard. */
const PRIMARY: Record<
  DashboardFocus,
  { label: string; href: string; icon: LucideIcon; permission: Permission; intent?: ListIntent }
> = {
  origination: {
    label: "New application",
    href: "/applications/new",
    icon: FilePlus,
    permission: "application:create",
  },
  verification: {
    label: "Verification queue",
    href: "/applications",
    icon: FileText,
    permission: "verification:run",
    intent: { filters: { status: "submitted,in_verification" }, sort: "updatedAt", dir: "asc" },
  },
  assessment: {
    label: "Assessment queue",
    href: "/applications",
    icon: FileText,
    permission: "assessment:edit",
    intent: { filters: { status: "in_assessment" }, sort: "updatedAt", dir: "asc" },
  },
  approval: { label: "My work", href: "/my-work", icon: Inbox, permission: "approval:act" },
  finance: { label: "Finance handover", href: "/handover", icon: Landmark, permission: "handover:view" },
  oversight: { label: "Reports", href: "/reports", icon: ChartColumn, permission: "reports:view" },
}

export function DashboardView() {
  const { user, permissions } = useSession()
  const { data, isPending, error, refetch } = useDashboardSummary()
  const now = new Date()
  const focus = data?.focus
  const ctx = { userId: user.id, focus: focus ?? "oversight" }
  const primary = focus && permissions.includes(PRIMARY[focus].permission) ? PRIMARY[focus] : null
  // Until the summary arrives, lay out for a queue: most roles have one.
  const hasQueue = isPending || !!data?.queue
  const hasInsights = !!data?.insights

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatDate(now, "EEEE, d MMMM yyyy")}
        title={`${greeting(now)}, ${user.name.split(" ")[0]}`}
        description={focus ? DESCRIPTION[focus] : "Here's what needs you today."}
        actions={
          primary ? (
            <Button asChild>
              <Link href={primary.href} onClick={() => primary.intent && setIntent("applications", primary.intent)}>
                <primary.icon aria-hidden /> {primary.label}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/applications">View applications</Link>
            </Button>
          )
        }
      />

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load the dashboard" />
        </Card>
      ) : (
        <>
          <FigureRow figures={data?.figures} ctx={ctx} loading={isPending} />
          <div className="grid gap-4 lg:grid-cols-3">
            {hasQueue ? (
              <QueueCard queue={data?.queue} focus={focus} loading={isPending} className="lg:col-span-2" />
            ) : (
              <StageAgingCard
                insights={data?.insights}
                showTurnaround={focus !== "oversight"}
                loading={isPending}
                className="lg:col-span-2"
              />
            )}
            <AttentionCard alerts={data?.alerts} ctx={ctx} loading={isPending} />
          </div>
          {hasInsights && (
            <div className="grid gap-4 lg:grid-cols-3">
              <VolumeCard
                monthly={data?.insights?.monthly}
                loading={isPending}
                className={cn(hasQueue ? "lg:col-span-2" : "lg:col-span-3")}
              />
              {hasQueue && (
                <StageAgingCard insights={data?.insights} showTurnaround={focus !== "oversight"} loading={isPending} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
