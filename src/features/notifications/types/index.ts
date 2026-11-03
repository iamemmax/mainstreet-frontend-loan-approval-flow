import type { z } from "zod"
import type { notificationKindSchema, notificationListSchema, notificationSchema } from "../schemas/notification"

export type Notification = z.infer<typeof notificationSchema>
export type NotificationKind = z.infer<typeof notificationKindSchema>
export type NotificationList = z.infer<typeof notificationListSchema>
