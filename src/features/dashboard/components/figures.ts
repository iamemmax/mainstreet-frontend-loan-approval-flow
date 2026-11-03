import type { ListIntent } from "@/lib/navigation/intent"
import type { DashboardFigure } from "../schemas/dashboard"
import type { DashboardContext } from "./alerts"

type FigureFormat = "count" | "money" | "days" | "percent" | "limit"

export const FIGURE: Record<
  DashboardFigure["key"],
  {
    label: string
    format: FigureFormat
    increaseIsBad?: boolean
    link?: (ctx: DashboardContext) => { href: string; intent?: ListIntent }
  }
> = {
  my_drafts: {
    label: "My drafts",
    format: "count",
    link: ({ userId }) => ({ href: "/applications", intent: { filters: { status: "draft", officerId: userId } } }),
  },
  returned_to_me: {
    label: "Returned to me",
    format: "count",
    link: ({ userId }) => ({
      href: "/applications",
      intent: { filters: { status: "returned,more_info_requested", officerId: userId } },
    }),
  },
  offers_out: {
    label: "Offers with customers",
    format: "count",
    link: ({ userId }) => ({ href: "/applications", intent: { filters: { status: "offer_sent", officerId: userId } } }),
  },
  accepted_month: {
    label: "Accepted this month",
    format: "money",
    link: ({ userId }) => ({
      href: "/applications",
      intent: { filters: { status: "offer_accepted,ready_for_disbursement", officerId: userId } },
    }),
  },

  to_start: {
    label: "Waiting to start",
    format: "count",
    link: () => ({
      href: "/applications",
      intent: { filters: { status: "submitted" }, sort: "updatedAt", dir: "asc" },
    }),
  },
  in_verification: {
    label: "In verification",
    format: "count",
    link: () => ({ href: "/applications", intent: { filters: { status: "in_verification" } } }),
  },
  checks_flagged: {
    label: "Checks flagged",
    format: "count",
    link: () => ({ href: "/applications", intent: { filters: { status: "in_verification" } } }),
  },
  verified_week: { label: "Verified this week", format: "count" },

  to_assess: {
    label: "To assess",
    format: "count",
    link: () => ({
      href: "/applications",
      intent: { filters: { status: "in_assessment" }, sort: "updatedAt", dir: "asc" },
    }),
  },
  oldest_assessment: {
    label: "Oldest in assessment",
    format: "days",
    link: () => ({
      href: "/applications",
      intent: { filters: { status: "in_assessment" }, sort: "updatedAt", dir: "asc" },
    }),
  },
  assessed_week: { label: "Assessed this week", format: "count" },

  awaiting_decision: { label: "Awaiting my decision", format: "count", link: () => ({ href: "/my-work" }) },
  past_sla: {
    label: "Past SLA",
    format: "count",
    link: ({ focus }) =>
      focus === "oversight"
        ? {
            href: "/applications",
            intent: { filters: { status: "pending_approval", sla: "breached" }, sort: "slaDueAt", dir: "asc" },
          }
        : { href: "/my-work" },
  },
  due_soon: { label: "Due soon", format: "count", link: () => ({ href: "/my-work" }) },
  approval_limit: { label: "My approval limit", format: "limit" },

  awaiting_handover: { label: "Awaiting handover", format: "count", link: () => ({ href: "/handover" }) },
  oldest_handover: { label: "Longest waiting", format: "days", link: () => ({ href: "/handover" }) },
  handed_over_month: {
    label: "Handed over this month",
    format: "money",
    link: () => ({ href: "/applications", intent: { filters: { status: "ready_for_disbursement" } } }),
  },
  handover_time: { label: "Time to hand over", format: "days", increaseIsBad: true },

  pipeline: {
    label: "Active pipeline",
    format: "money",
    link: () => ({
      href: "/applications",
      intent: {
        filters: {
          status:
            "submitted,in_verification,in_assessment,pending_approval,returned,more_info_requested,approved,offer_sent,offer_accepted",
        },
      },
    }),
  },
  turnaround: { label: "Turnaround", format: "days", increaseIsBad: true },
  approval_rate: { label: "Approval rate", format: "percent", link: () => ({ href: "/reports" }) },
}

/** "4h", "2.5 days", "12 days". */
export function formatDays(days: number): string {
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`
  const rounded = days < 10 ? Math.round(days * 10) / 10 : Math.round(days)
  return `${rounded} ${rounded === 1 ? "day" : "days"}`
}
