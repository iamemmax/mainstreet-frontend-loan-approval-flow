import type { Metadata } from "next"
import { HandoverView } from "@/features/handover/components/handover-view"

export const metadata: Metadata = { title: "Finance handover" }

export default function HandoverPage() {
  return <HandoverView />
}
