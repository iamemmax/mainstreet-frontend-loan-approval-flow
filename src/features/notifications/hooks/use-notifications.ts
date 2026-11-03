"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchNotifications, markNotificationsRead, notificationKeys } from "../api/notifications"
import type { NotificationList } from "../types"

export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.all, queryFn: fetchNotifications, refetchInterval: 60_000 })
}

/** Optimistic: marking as read is safe to show before the server confirms. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationsRead,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })
      const previous = queryClient.getQueryData<NotificationList>(notificationKeys.all)
      if (previous) {
        const at = new Date().toISOString()
        const items = previous.items.map((n) =>
          ids === "all" || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? at } : n,
        )
        queryClient.setQueryData<NotificationList>(notificationKeys.all, {
          items,
          unread: items.filter((n) => !n.readAt).length,
        })
      }
      return { previous }
    },
    onError: (_e, _ids, ctx) => ctx?.previous && queryClient.setQueryData(notificationKeys.all, ctx.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
