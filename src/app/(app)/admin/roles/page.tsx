import type { Metadata } from "next"
import { RolesAdmin } from "@/features/admin/components/roles-admin"

export const metadata: Metadata = { title: "Roles & permissions" }

export default function Page() {
  return <RolesAdmin />
}
