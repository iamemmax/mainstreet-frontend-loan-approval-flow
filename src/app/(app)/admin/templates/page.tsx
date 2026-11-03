import type { Metadata } from "next"
import { TemplatesAdmin } from "@/features/admin/components/templates-admin"

export const metadata: Metadata = { title: "Templates" }

export default function Page() {
  return <TemplatesAdmin />
}
