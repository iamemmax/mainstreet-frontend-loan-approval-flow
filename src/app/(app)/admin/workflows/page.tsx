import type { Metadata } from "next"
import { WorkflowsAdmin } from "@/features/admin/components/workflows-admin"

export const metadata: Metadata = { title: "Workflow builder" }

export default function Page() {
  return <WorkflowsAdmin />
}
