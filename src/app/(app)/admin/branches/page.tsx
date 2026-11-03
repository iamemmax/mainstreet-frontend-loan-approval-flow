import type { Metadata } from "next"
import { BranchesAdmin } from "@/features/admin/components/branches-admin"

export const metadata: Metadata = { title: "Branches & regions" }

export default function Page() {
  return <BranchesAdmin />
}
