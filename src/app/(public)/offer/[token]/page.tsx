import type { Metadata } from "next"
import { OfferView } from "@/features/offer/components/offer-view"

export const metadata: Metadata = { title: "Your loan offer" }

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <OfferView token={token} />
}
