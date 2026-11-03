import { z } from "zod"
import { isoDate, koboSchema } from "@/lib/api/schemas"
import { segmentSchema } from "@/features/workflow/schemas/workflow"
import { PERSONAL_FOCUS } from "@/lib/rbac/profiles"

export const REPORT_RANGES = ["30d", "90d", "12m", "all"] as const
export const reportRangeSchema = z.enum(REPORT_RANGES)
export type ReportRange = z.infer<typeof reportRangeSchema>

export const reportsParamsSchema = z.object({
  range: reportRangeSchema.default("90d"),
  branchId: z.string().optional(),
  productId: z.string().optional(),
  segment: segmentSchema.optional(),
})
export type ReportsParams = z.input<typeof reportsParamsSchema>

const countValueSchema = z.object({ count: z.number().int().nonnegative(), value: koboSchema })
const periodSchema = z.object({ from: isoDate.nullable(), to: isoDate })

export const performanceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().int(),
  value: koboSchema,
  approved: z.number().int(),
  rejected: z.number().int(),
  disbursedValue: koboSchema,
})

export const FUNNEL_STEPS = [
  "submitted",
  "verified",
  "approval",
  "approved",
  "offer_sent",
  "accepted",
  "handed_over",
] as const
export const STEP_TIMES = ["verification", "assessment_approval", "acceptance", "handover"] as const

/** Whole-book view for credit management, audit and admin. */
export const managementReportSchema = z.object({
  kind: z.literal("management"),
  generatedAt: isoDate,
  period: periodSchema,
  totals: z.object({
    applied: countValueSchema,
    approved: countValueSchema,
    rejected: z.number().int(),
    accepted: countValueSchema,
    medianTurnaroundDays: z.number().nullable(),
  }),
  /** Applications submitted in the period and how far they got. */
  funnel: z.array(z.object({ key: z.enum(FUNNEL_STEPS), count: z.number().int() })),
  /** Median days each step took, for steps finished in the period. */
  stepTimes: z.array(z.object({ key: z.enum(STEP_TIMES), medianDays: z.number().nullable(), count: z.number().int() })),
  rejectionReasons: z.array(z.object({ code: z.string(), label: z.string(), count: z.number().int() })),
  byBranch: z.array(performanceRowSchema),
  byProduct: z.array(performanceRowSchema),
  byOfficer: z.array(performanceRowSchema),
  byAgent: z.array(performanceRowSchema),
})

export const PERSONAL_FIGURES = [
  // Relationship officer
  "submitted",
  "approved",
  "returned",
  "accepted",
  // Verification officer
  "verified",
  "verification_time",
  "checks_flagged",
  "rejected_at_verification",
  // Credit analyst
  "assessed",
  "assessment_time",
  "decisions",
  "recommendation_match",
] as const

/** One person's own work: no one else's numbers. */
export const personalReportSchema = z.object({
  kind: z.literal("personal"),
  focus: z.enum(PERSONAL_FOCUS),
  generatedAt: isoDate,
  period: periodSchema,
  figures: z.array(
    z.object({
      key: z.enum(PERSONAL_FIGURES),
      /** Count, kobo, days or ratio depending on the key. */
      value: z.number().nullable(),
      note: z.string().nullable(),
    }),
  ),
  breakdown: z.object({
    title: z.string(),
    description: z.string(),
    rows: z.array(
      z.object({
        label: z.string(),
        count: z.number().int(),
        tone: z.enum(["neutral", "success", "warning", "danger"]),
      }),
    ),
  }),
})

export const financeRowSchema = countValueSchema.extend({ id: z.string(), name: z.string() })

/** What finance has taken over for disbursement. */
export const financeReportSchema = z.object({
  kind: z.literal("finance"),
  generatedAt: isoDate,
  period: periodSchema,
  totals: z.object({
    handedOver: countValueSchema,
    medianHandoverDays: z.number().nullable(),
    waiting: countValueSchema,
    averageLoan: koboSchema.nullable(),
  }),
  /** Handed over per calendar month, last 6 months. */
  monthly: z.array(countValueSchema.extend({ month: z.string(), label: z.string() })),
  byBranch: z.array(financeRowSchema),
  byProduct: z.array(financeRowSchema),
})

export const reportsSummarySchema = z.discriminatedUnion("kind", [
  managementReportSchema,
  personalReportSchema,
  financeReportSchema,
])

export type ReportsSummary = z.infer<typeof reportsSummarySchema>
export type ManagementReport = z.infer<typeof managementReportSchema>
export type PersonalReport = z.infer<typeof personalReportSchema>
export type FinanceReport = z.infer<typeof financeReportSchema>
export type PerformanceRow = z.infer<typeof performanceRowSchema>
export type FinanceRow = z.infer<typeof financeRowSchema>
