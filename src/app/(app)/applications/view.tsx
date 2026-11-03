"use client"

import { Suspense } from "react"
import { ApplicationsView } from "@/features/applications/components/applications-view"

export function ApplicationsRoute() {
  return (
    <Suspense>
      <ApplicationsView />
    </Suspense>
  )
}
