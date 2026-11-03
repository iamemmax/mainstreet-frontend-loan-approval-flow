import {
  ArrowUpRight,
  Ban,
  CircleAlert,
  CircleCheck,
  Clock,
  Inbox,
  MessageSquare,
  MessagesSquare,
  TriangleAlert,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react"
import type { NotificationKind } from "@/features/notifications/types"

/** How each kind of notification looks: an icon on a tinted tile. */
export const KIND_META: Record<NotificationKind, { icon: LucideIcon; tile: string }> = {
  approval_assigned: { icon: Inbox, tile: "bg-primary/[0.08] text-primary" },
  sla_reminder: { icon: Clock, tile: "bg-warning/12 text-warning" },
  sla_breached: { icon: TriangleAlert, tile: "bg-destructive/[0.08] text-destructive" },
  auto_escalated: { icon: ArrowUpRight, tile: "bg-warning/12 text-warning" },
  application_returned: { icon: CircleAlert, tile: "bg-warning/12 text-warning" },
  info_requested: { icon: MessageSquare, tile: "bg-warning/12 text-warning" },
  offer_accepted: { icon: CircleCheck, tile: "bg-success/10 text-success" },
  delegation: { icon: UserRoundCheck, tile: "bg-primary/[0.08] text-primary" },
  message: { icon: MessagesSquare, tile: "bg-primary/[0.08] text-primary" },
  application_rejected: { icon: Ban, tile: "bg-destructive/[0.08] text-destructive" },
}
