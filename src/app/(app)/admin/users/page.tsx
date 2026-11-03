import type { Metadata } from "next"
import { UsersAdmin } from "@/features/admin/components/users-admin"

export const metadata: Metadata = { title: "Users" }

export default function Page() {
  return <UsersAdmin />
}
