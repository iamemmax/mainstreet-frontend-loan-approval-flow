import type { Metadata } from "next"
import { Suspense } from "react"
import { MyWorkView } from "@/features/my-work/components/my-work-view"

export const metadata: Metadata = { title: "My work" }

export default function MyWorkPage() {
  return (
    <Suspense>
      <MyWorkView />
    </Suspense>
  )
}
