import { z } from "zod"
import { mockRequest } from "@/mocks/transport"
import { notificationListSchema } from "../schemas/notification"

export const notificationKeys = {
  all: ["notifications"] as const,
}

export function fetchNotifications() {
  return mockRequest(notificationListSchema, ({ store, session }) => {
    const items = store.notifications
      .filter((n) => n.userId === session.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return { items, unread: items.filter((n) => !n.readAt).length }
  })
}

/** Marks the given notifications (or all of them) as read. */
export function markNotificationsRead(ids: string[] | "all") {
  return mockRequest(z.null(), ({ store, session }) => {
    const at = new Date().toISOString()
    for (const n of store.notifications) {
      if (n.userId === session.user.id && !n.readAt && (ids === "all" || ids.includes(n.id))) n.readAt = at
    }
    return null
  })
}
