"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchMyPerformance, fetchReportsSummary, reportsKeys } from "../api/reports"
import type { ReportRange, ReportsParams } from "../schemas/reports"

export function useReportsSummary(params: ReportsParams) {
  // Keep the last report on screen while a new range or filter loads.
  return useQuery({
    queryKey: reportsKeys.summary(params),
    queryFn: () => fetchReportsSummary(params),
    placeholderData: keepPreviousData,
  })
}

/** The signed-in person's own figures for the dashboard. */
export function useMyPerformance(range: ReportRange) {
  return useQuery({
    queryKey: reportsKeys.performance(range),
    queryFn: () => fetchMyPerformance(range),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60_000,
  })
}
