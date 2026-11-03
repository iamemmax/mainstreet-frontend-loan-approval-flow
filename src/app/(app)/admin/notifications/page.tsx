import type { Metadata } from "next"
import { NotificationsAdmin } from "@/features/admin/components/notifications-admin"

export const metadata: Metadata = { title: "Notification settings" }

export default function Page() {
  return <NotificationsAdmin />
}
