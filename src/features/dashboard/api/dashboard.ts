import { mockRequest } from "@/mocks/transport"
import { dashboardSummary } from "@/mocks/handlers/dashboard"
import { dashboardSummarySchema } from "../schemas/dashboard"

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
}

// Real backend: apiFetch("/dashboard/summary", { schema: dashboardSummarySchema })
export function fetchDashboardSummary() {
  return mockRequest(dashboardSummarySchema, ({ store, session }) => dashboardSummary(store, session), {
    permission: "application:view",
  })
}
