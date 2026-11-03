import { mockRequest } from "@/mocks/transport"
import { reportsSummary } from "@/mocks/handlers/reports"
import { type ReportsParams, reportsParamsSchema, reportsSummarySchema } from "../schemas/reports"

export const reportsKeys = {
  all: ["reports"] as const,
  summary: (params: ReportsParams) => [...reportsKeys.all, "summary", params] as const,
}

// Real backend: apiFetch("/reports/summary", { params, schema: reportsSummarySchema })
export function fetchReportsSummary(params: ReportsParams) {
  const parsed = reportsParamsSchema.parse(params)
  return mockRequest(reportsSummarySchema, ({ store, session }) => reportsSummary(store, session, parsed), {
    permission: "reports:view",
  })
}
