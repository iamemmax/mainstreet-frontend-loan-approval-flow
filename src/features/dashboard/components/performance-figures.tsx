"use client"

import { ErrorState } from "@/components/shared/empty-state"
import { Card } from "@/components/ui/card"
import { PersonalFigures } from "@/features/reports/components/personal-report"
import { useMyPerformance } from "@/features/reports/hooks/use-reports"

/** The signed-in person's own figures for the last 30 days, under the dashboard's headline numbers. */
export function PerformanceFigures() {
  const { data, isPending, error, refetch } = useMyPerformance("30d")
  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load your performance" />
      </Card>
    )
  }
  return <PersonalFigures data={data} loading={isPending} />
}
