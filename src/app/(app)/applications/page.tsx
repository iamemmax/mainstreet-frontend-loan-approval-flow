import type { Metadata } from "next"
import { ApplicationsRoute } from "./view"

export const metadata: Metadata = { title: "Applications" }

export default function Page() {
  return <ApplicationsRoute />
}
