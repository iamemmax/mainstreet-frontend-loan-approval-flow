import {
  Clock,
  Hourglass,
  Landmark,
  type LucideIcon,
  ScanSearch,
  ShieldAlert,
  TriangleAlert,
  Undo2,
} from "lucide-react"
import type { Tone } from "@/components/shared/tone"
import { pluralize as plural } from "@/lib/format/money"
import type { ListIntent } from "@/lib/navigation/intent"
import type { DashboardFocus, DashboardSummary } from "../schemas/dashboard"

export interface DashboardContext {
  userId: string
  focus: DashboardFocus
}

export const ALERT: Record<
  DashboardSummary["alerts"][number]["key"],
  {
    tone: Tone
    icon: LucideIcon
    title: (n: number) => string
    detail: string
    link: (ctx: DashboardContext) => { href: string; intent?: ListIntent }
  }
> = {
  sla_breached: {
    tone: "danger",
    icon: TriangleAlert,
    title: (n) => `${plural(n, "approval is", "approvals are")} past SLA`,
    detail: "Oldest first",
    link: ({ focus }) =>
      focus === "oversight"
        ? {
            href: "/applications",
            intent: { filters: { status: "pending_approval", sla: "breached" }, sort: "slaDueAt", dir: "asc" },
          }
        : { href: "/my-work" },
  },
  sla_due_soon: {
    tone: "warning",
    icon: Clock,
    title: (n) => `${plural(n, "approval is", "approvals are")} due within hours`,
    detail: "Decide before they breach",
    link: ({ focus }) =>
      focus === "oversight"
        ? {
            href: "/applications",
            intent: { filters: { status: "pending_approval", sla: "due_soon" }, sort: "slaDueAt", dir: "asc" },
          }
        : { href: "/my-work" },
  },
  checks_failed: {
    tone: "danger",
    icon: ScanSearch,
    title: (n) => `${plural(n, "application has", "applications have")} failed or flagged checks`,
    detail: "Read the findings before completing verification",
    link: () => ({ href: "/applications", intent: { filters: { status: "in_verification" } } }),
  },
  returned: {
    tone: "warning",
    icon: Undo2,
    title: (n) => `${plural(n, "application", "applications")} returned for correction`,
    detail: "Fix and resubmit",
    link: ({ focus, userId }) => ({
      href: "/applications",
      intent: {
        filters: { status: "returned,more_info_requested", ...(focus === "origination" && { officerId: userId }) },
      },
    }),
  },
  flagged: {
    tone: "danger",
    icon: ShieldAlert,
    title: (n) => `${plural(n, "open application is", "open applications are")} flagged`,
    detail: "Possible duplicate, PEP match or failed BVN",
    link: () => ({ href: "/applications" }),
  },
  offers_expiring: {
    tone: "warning",
    icon: Hourglass,
    title: (n) => `${plural(n, "offer expires", "offers expire")} within 48 hours`,
    detail: "Call the customer before the link lapses",
    link: ({ focus, userId }) => ({
      href: "/applications",
      intent: {
        filters: { status: "offer_sent", ...(focus === "origination" && { officerId: userId }) },
        sort: "updatedAt",
        dir: "asc",
      },
    }),
  },
  awaiting_handover: {
    tone: "warning",
    icon: Landmark,
    title: (n) => `${plural(n, "accepted loan has", "accepted loans have")} waited over 2 days`,
    detail: "Hand over to finance for disbursement",
    link: () => ({ href: "/handover" }),
  },
}
