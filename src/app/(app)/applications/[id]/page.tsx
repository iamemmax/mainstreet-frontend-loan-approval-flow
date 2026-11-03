import { Suspense } from "react"
import { ApplicationDetail } from "@/features/applications/components/detail/application-detail"

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <ApplicationDetail id={id} />
    </Suspense>
  )
}
