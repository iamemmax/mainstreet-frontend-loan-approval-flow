import { mockRequest } from "@/mocks/transport"
import { myPerformance, reportsSummary } from "@/mocks/handlers/reports"
import {
  personalReportSchema,
  type ReportRange,
  type ReportsParams,
  reportsParamsSchema,
  reportsSummarySchema,
} from "../schemas/reports"

export const reportsKeys = {
  all: ["reports"] as const,
  summary: (params: ReportsParams) => [...reportsKeys.all, "summary", params] as const,
  performance: (range: ReportRange) => [...reportsKeys.all, "performance", range] as const,
}

// Real backend: apiFetch("/reports/summary", { params, schema: reportsSummarySchema })
export function fetchReportsSummary(params: ReportsParams) {
  const parsed = reportsParamsSchema.parse(params)
  return mockRequest(reportsSummarySchema, ({ store, session }) => reportsSummary(store, session, parsed), {
    permission: "reports:view",
  })
}

/** The signed-in person's own work, shown on the dashboard for roles without a Reports page. */
// Real backend: apiFetch("/reports/my-performance", { params: { range }, schema: personalReportSchema })
export function fetchMyPerformance(range: ReportRange) {
  return mockRequest(personalReportSchema, ({ store, session }) => myPerformance(store, session, range), {
    permission: "application:view",
  })
}
