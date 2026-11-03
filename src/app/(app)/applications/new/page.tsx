import type { Metadata } from "next"
import { NewApplicationRoute } from "./view"

export const metadata: Metadata = { title: "New application" }

export default function Page() {
  return <NewApplicationRoute />
}
