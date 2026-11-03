import type { Metadata } from "next"
import { ContinueApplication } from "@/features/applications/components/new-application/continue-application"

export const metadata: Metadata = { title: "Continue application" }

export default async function ContinueApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ContinueApplication id={id} />
}
