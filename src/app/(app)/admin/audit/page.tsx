import type { Metadata } from "next"
import { Suspense } from "react"
import { AuditLog } from "@/features/admin/components/audit-log"

export const metadata: Metadata = { title: "Audit log" }

export default function Page() {
  return (
    <Suspense>
      <AuditLog />
    </Suspense>
  )
}
