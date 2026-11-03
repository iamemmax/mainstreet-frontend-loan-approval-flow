import type { Metadata } from "next"
import { IntegrationsAdmin } from "@/features/admin/components/integrations-admin"

export const metadata: Metadata = { title: "Integrations" }

export default function Page() {
  return <IntegrationsAdmin />
}
