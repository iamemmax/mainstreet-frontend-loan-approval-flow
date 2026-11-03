import { z } from "zod"
import { isoDate } from "@/lib/api/schemas"

export const notificationKindSchema = z.enum([
  "approval_assigned",
  "sla_reminder",
  "sla_breached",
  "auto_escalated",
  "application_returned",
  "info_requested",
  "offer_accepted",
  "delegation",
  "message",
  "application_rejected",
])

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  createdAt: isoDate,
  readAt: isoDate.nullable(),
})

export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  unread: z.number().int().nonnegative(),
})
