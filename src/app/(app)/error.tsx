"use client"

import { ErrorState } from "@/components/shared/empty-state"

export default function StaffError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState className="py-24" title="This page hit an error" error={error} onRetry={reset} />
}
