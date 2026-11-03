"use client"

import {
  Ban,
  Calculator,
  CircleCheck,
  Clock,
  CornerUpLeft,
  FilePen,
  Handshake,
  Landmark,
  Mail,
  MessageCircleQuestion,
  ScanSearch,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  STATUS_LABELS,
  type ApplicationStatus,
  type RiskRating,
  type SlaState,
} from "@/features/applications/schemas/status"
import { formatDuration } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import { useNow } from "@/hooks/use-now"
import { TONE_BADGE, TONE_DOT, type Tone } from "./tone"

interface ToneBadgeProps {
  tone: Tone
  children: ReactNode
  icon?: ReactNode
  dot?: boolean
  className?: string
  title?: string
}

/** Base pill used by every status-like badge, so they all look the same. */
export function ToneBadge({ tone, children, icon, dot, className, title }: ToneBadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
        TONE_BADGE[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {icon}
      {children}
    </span>
  )
}

export const STATUS_TONE: Record<ApplicationStatus, Tone> = {
  draft: "neutral",
  submitted: "info",
  in_verification: "info",
  in_assessment: "info",
  pending_approval: "accent",
  returned: "warning",
  more_info_requested: "warning",
  approved: "success",
  rejected: "danger",
  offer_sent: "accent",
  offer_accepted: "success",
  ready_for_disbursement: "success",
}

const STATUS_ICON: Record<ApplicationStatus, LucideIcon> = {
  draft: FilePen,
  submitted: Send,
  in_verification: ScanSearch,
  in_assessment: Calculator,
  pending_approval: Clock,
  returned: CornerUpLeft,
  more_info_requested: MessageCircleQuestion,
  approved: CircleCheck,
  rejected: Ban,
  offer_sent: Mail,
  offer_accepted: Handshake,
  ready_for_disbursement: Landmark,
}

/** `icon` swaps the dot for an icon that says what the status means at a glance. */
export function StatusBadge({
  status,
  className,
  icon,
}: {
  status: ApplicationStatus
  className?: string
  icon?: boolean
}) {
  const Icon = STATUS_ICON[status]
  return (
    <ToneBadge
      tone={STATUS_TONE[status]}
      dot={!icon}
      icon={icon ? <Icon aria-hidden /> : undefined}
      className={className}
    >
      {STATUS_LABELS[status]}
    </ToneBadge>
  )
}

const RISK: Record<RiskRating, { tone: Tone; label: string; icon: ReactNode }> = {
  low: { tone: "success", label: "Low risk", icon: <ShieldCheck aria-hidden /> },
  medium: { tone: "warning", label: "Medium risk", icon: <ShieldQuestion aria-hidden /> },
  high: { tone: "danger", label: "High risk", icon: <ShieldAlert aria-hidden /> },
}

export function RiskBadge({ rating, className }: { rating: RiskRating | null; className?: string }) {
  if (!rating) {
    return (
      <ToneBadge tone="neutral" className={className}>
        Not rated
      </ToneBadge>
    )
  }
  const r = RISK[rating]
  return (
    <ToneBadge tone={r.tone} icon={r.icon} className={className}>
      {r.label}
    </ToneBadge>
  )
}

const SLA: Record<SlaState, { tone: Tone; label: string }> = {
  on_track: { tone: "success", label: "On track" },
  due_soon: { tone: "warning", label: "Due soon" },
  breached: { tone: "danger", label: "Breached" },
}

interface SLABadgeProps {
  state: SlaState
  /** When given, shows a live countdown ("4h 12m left" / "2h over"). */
  dueAt?: string | Date
  className?: string
}

export function SLABadge({ state, dueAt, className }: SLABadgeProps) {
  const now = useNow()
  const s = SLA[state]
  let detail: string | null = null
  if (dueAt) {
    const remaining = new Date(dueAt).getTime() - now.getTime()
    detail = remaining >= 0 ? `${formatDuration(remaining)} left` : `${formatDuration(remaining)} over`
  }
  return (
    <ToneBadge
      tone={s.tone}
      icon={state === "breached" ? <TriangleAlert aria-hidden /> : <Clock aria-hidden />}
      className={cn("tabular", className)}
      title={dueAt ? `Due ${new Date(dueAt).toLocaleString("en-NG")}` : undefined}
    >
      {s.label}
      {detail && <span className="font-normal opacity-80">· {detail}</span>}
    </ToneBadge>
  )
}
