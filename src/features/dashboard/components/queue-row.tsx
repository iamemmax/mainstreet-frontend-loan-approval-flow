"use client"

import {
  ChevronRight,
  ClipboardCheck,
  Calculator,
  FilePen,
  Gavel,
  Landmark,
  type LucideIcon,
  MailQuestion,
  RotateCcw,
  ScanSearch,
  Send,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { MoneyText } from "@/components/shared/money-text"
import { TONE_TEXT, type Tone } from "@/components/shared/tone"
import { setIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import type { QueueAction, QueueItem } from "../schemas/dashboard"
import { formatDays } from "./figures"

/** What each kind of task is called, what it involves, its icon, and where a row goes: a tab, or the draft form. */
export const QUEUE_ACTION: Record<
  QueueAction,
  { label: string; hint: string; icon: LucideIcon; tab?: string; draftForm?: boolean }
> = {
  finish_draft: {
    label: "Finish draft",
    hint: "Complete the missing details and send to verification",
    icon: FilePen,
    draftForm: true,
  },
  fix_return: {
    label: "Fix and resubmit",
    hint: "Sent back to you with a reason to correct",
    icon: RotateCcw,
    tab: "activity",
  },
  start_verification: {
    label: "Start verification",
    hint: "New applications waiting for identity and bureau checks",
    icon: ShieldCheck,
    tab: "verification",
  },
  run_checks: { label: "Run checks", hint: "Checks still to run or review", icon: ScanSearch, tab: "verification" },
  complete_verification: {
    label: "Complete verification",
    hint: "Every check is in; confirm and pass to assessment",
    icon: ClipboardCheck,
    tab: "verification",
  },
  assess: {
    label: "Assess",
    hint: "Affordability, score and your recommendation",
    icon: Calculator,
    tab: "assessment",
  },
  decide: { label: "Decide", hint: "Approve or decline at your stage", icon: Gavel, tab: "workflow" },
  send_offer: { label: "Send offer", hint: "Approved and ready to go to the customer", icon: Send, tab: "offer" },
  chase_offer: {
    label: "Follow up with the customer",
    hint: "Offers about to expire without a reply",
    icon: MailQuestion,
    tab: "offer",
  },
  hand_over: {
    label: "Hand over to finance",
    hint: "Accepted by the customer, ready for disbursement",
    icon: Landmark,
    tab: "offer",
  },
}

/** Waiting under 2 days is fine, under 2 weeks is getting late, beyond that it's overdue. */
function ageTone(days: number): Tone {
  if (days >= 14) return "danger"
  if (days >= 2) return "warning"
  return "neutral"
}

/** How urgent the row reads: past its SLA, close to it, or simply how long it has waited. */
function waitLine(item: QueueItem, days: number, now: number): { text: string; tone: Tone } {
  if (!item.sla) return { text: `Waiting ${formatDays(days)}`, tone: ageTone(days) }
  const untilDue = (Date.parse(item.sla.dueAt) - now) / 86_400_000
  if (item.sla.state === "breached") return { text: `Overdue by ${formatDays(-untilDue)}`, tone: "danger" }
  return { text: `Due in ${formatDays(untilDue)}`, tone: item.sla.state === "due_soon" ? "warning" : "neutral" }
}

/** Past its SLA, or waiting two weeks or more where there's no SLA. */
export function isOverdue(item: QueueItem, now: number): boolean {
  return waitLine(item, (now - Date.parse(item.since)) / 86_400_000, now).tone === "danger"
}

/** One task as a single clickable line: who it's for, what it's worth, and how long it has waited. */
export function QueueRow({ item, now }: { item: QueueItem; now: number }) {
  const action = QUEUE_ACTION[item.action]
  const days = (now - Date.parse(item.since)) / 86_400_000
  const wait = waitLine(item, days, now)
  const href = action.draftForm ? `/applications/${item.id}/edit` : `/applications/${item.id}`
  const detail = item.action === "decide" && item.currentStageName ? item.currentStageName : item.productName

  return (
    <li>
      <Link
        href={href}
        onClick={() => action.tab && setIntent("applicationTab", action.tab)}
        className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <InitialsAvatar name={item.applicantName} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium">{item.applicantName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {detail}
            {item.onBehalfOfName && <> · for {item.onBehalfOfName}</>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <MoneyText value={item.amountRequested} format="compact" className="block text-[15px] font-semibold" />
          <div className={cn("text-xs whitespace-nowrap", TONE_TEXT[wait.tone])}>{wait.text}</div>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </Link>
    </li>
  )
}
