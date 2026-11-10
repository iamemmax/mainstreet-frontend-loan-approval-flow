import { z } from "zod"
import { isoDate, koboSchema } from "@/lib/api/schemas"
import { applicationListItemSchema } from "@/features/applications/schemas/application"
import { applicationStatusSchema } from "@/features/applications/schemas/status"
import { DASHBOARD_FOCUS } from "@/lib/rbac/profiles"

const countValueSchema = z.object({ count: z.number().int().nonnegative(), value: koboSchema })

/** Which team's view of the dashboard the user gets (set per role in ROLE_PROFILE). */
export const dashboardFocusSchema = z.enum(DASHBOARD_FOCUS)

export const FIGURE_KEYS = [
  // Relationship officer
  "my_drafts",
  "returned_to_me",
  "offers_out",
  "accepted_month",
  // Verification officer
  "to_start",
  "in_verification",
  "checks_flagged",
  "verified_week",
  // Credit analyst
  "to_assess",
  "oldest_assessment",
  "assessed_week",
  // Approvers
  "awaiting_decision",
  "past_sla",
  "due_soon",
  "approval_limit",
  // Finance
  "awaiting_handover",
  "oldest_handover",
  "handed_over_month",
  "handover_time",
  // Oversight
  "pipeline",
  "turnaround",
  "approval_rate",
] as const

export const figureSchema = z.object({
  key: z.enum(FIGURE_KEYS),
  /** Count, kobo, days or ratio depending on the key. `null` means not enough data (or, for a limit, uncapped). */
  value: z.number().nullable(),
  /** Same measure for the previous period, when a comparison makes sense. */
  previous: z.number().nullable(),
  note: z.string().nullable(),
  tone: z.enum(["neutral", "warning", "danger"]),
})

export const QUEUE_ACTIONS = [
  "finish_draft",
  "fix_return",
  "start_verification",
  "run_checks",
  "complete_verification",
  "assess",
  "decide",
  "send_offer",
  "chase_offer",
  "hand_over",
] as const

export const queueItemSchema = applicationListItemSchema.extend({
  action: z.enum(QUEUE_ACTIONS),
  /** When the application reached the step that is now waiting on this user. */
  since: isoDate,
  onBehalfOfName: z.string().nullable(),
})

export const PIPELINE_STAGES = [
  "intake",
  "verification",
  "assessment",
  "approval",
  "returned",
  "offer",
  "handover",
] as const
export const pipelineStageSchema = z.enum(PIPELINE_STAGES)

export const DASHBOARD_ALERTS = [
  "sla_breached",
  "sla_due_soon",
  "checks_failed",
  "returned",
  "flagged",
  "offers_expiring",
  "awaiting_handover",
] as const

export const dashboardSummarySchema = z.object({
  generatedAt: isoDate,
  focus: dashboardFocusSchema,
  figures: z.array(figureSchema),
  /** What is waiting on this user, most urgent first. `null` for roles that never hold work. */
  queue: z.object({ total: z.number().int(), items: z.array(queueItemSchema) }).nullable(),
  /** Only alerts this user can act on and that have something in them, most urgent first. */
  alerts: z.array(
    z.object({ key: z.enum(DASHBOARD_ALERTS), count: z.number().int().positive(), examples: z.array(z.string()) }),
  ),
  /** Where loans are waiting and how fast they move. Managers and oversight only. */
  insights: z
    .object({
      stages: z.array(
        countValueSchema.extend({
          key: pipelineStageSchema,
          label: z.string(),
          statuses: z.array(applicationStatusSchema),
          avgDays: z.number().nullable(),
          oldestDays: z.number().nullable(),
        }),
      ),
      /** Median days from submission to accepted offer, last 30 days and the 30 before. */
      turnaround: z.object({
        days: z.number().nullable(),
        previousDays: z.number().nullable(),
        count: z.number().int(),
      }),
      /** Submitted applications per calendar month, oldest first. */
      monthly: z.array(countValueSchema.extend({ month: z.string(), label: z.string() })),
    })
    .nullable(),
  /** The team's two charts: what it got done each month, and where its work stands now. Roles without insights. */
  charts: z
    .object({
      activity: z.object({
        title: z.string(),
        description: z.string(),
        /** What one unit is called in the tooltip, e.g. "files". */
        unit: z.string(),
        months: z.array(countValueSchema.extend({ month: z.string(), label: z.string() })),
      }),
      breakdown: z.object({
        title: z.string(),
        description: z.string(),
        rows: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            count: z.number().int().nonnegative(),
            /** Late work is coloured as a warning; everything else stays neutral. */
            tone: z.enum(["neutral", "warning", "danger"]),
          }),
        ),
      }),
    })
    .nullable(),
})

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>
export type DashboardFigure = z.infer<typeof figureSchema>
export type DashboardFocus = z.infer<typeof dashboardFocusSchema>
export type QueueItem = z.infer<typeof queueItemSchema>
export type QueueAction = (typeof QUEUE_ACTIONS)[number]
