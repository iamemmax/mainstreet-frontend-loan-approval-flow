"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchReportsSummary, reportsKeys } from "../api/reports"
import type { ReportsParams } from "../schemas/reports"

export function useReportsSummary(params: ReportsParams) {
  // Keep the last report on screen while a new range or filter loads.
  return useQuery({
    queryKey: reportsKeys.summary(params),
    queryFn: () => fetchReportsSummary(params),
    placeholderData: keepPreviousData,
  })
}
