"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardKeys, fetchDashboardSummary } from "../api/dashboard"

export function useDashboardSummary() {
  return useQuery({ queryKey: dashboardKeys.summary(), queryFn: fetchDashboardSummary, refetchInterval: 60_000 })
}
