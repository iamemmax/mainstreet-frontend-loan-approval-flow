import { z } from "zod"
import { roleSchema } from "@/lib/rbac/roles"
import { isoDate, koboSchema } from "@/lib/api/schemas"

export const segmentSchema = z.enum(["retail", "sme"])

export const DECISION_ACTIONS = ["approve", "reject", "return", "escalate", "request_info"] as const
export const decisionActionSchema = z.enum(DECISION_ACTIONS)

export const workflowStageSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  /** More than one role makes this a parallel stage. */
  approverRoles: z.array(roleSchema).min(1),
  /** For parallel stages: does every role need to approve, or any one of them? */
  quorum: z.enum(["any", "all"]),
  slaHours: z.number().positive(),
  /** Send a reminder once this share of the SLA has elapsed (0–100). */
  reminderAtPercent: z.number().min(0).max(100),
  /** Escalate to the next stage automatically once the SLA is breached by this many hours. */
  autoEscalateAfterHours: z.number().nonnegative().nullable(),
  /**
   * A committee stage: named members each cast one vote. The stage approves
   * once `votesRequired` members vote approve, and declines once enough vote
   * decline that approval is no longer possible.
   */
  committee: z
    .object({
      memberIds: z.array(z.string()).min(1),
      votesRequired: z.number().int().positive(),
    })
    .nullable()
    .default(null),
})

/**
 * Amount bands decide where the chain closes: an application in a band stops
 * at that band's final stage. Bands must be contiguous from ₦0 and the last
 * band must be uncapped.
 */
export const approvalBandSchema = z.object({
  id: z.string(),
  minAmount: koboSchema,
  maxAmount: koboSchema.nullable(),
  finalStageKey: z.string(),
})

export const workflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  segment: segmentSchema,
  version: z.number().int().positive(),
  stages: z.array(workflowStageSchema),
  bands: z.array(approvalBandSchema),
  updatedAt: isoDate,
  updatedById: z.string(),
})

export const decisionSchema = z.object({
  id: z.string(),
  stageKey: z.string(),
  action: decisionActionSchema,
  reasonCode: z.string(),
  comment: z.string(),
  actorId: z.string(),
  actorRole: roleSchema,
  /** Set when the actor decided under a delegation. */
  onBehalfOfId: z.string().nullable(),
  /** Set when the system made the decision (auto-escalation). */
  automated: z.boolean(),
  at: isoDate,
})

export const stageApprovalSchema = z.object({
  role: roleSchema,
  userId: z.string(),
  at: isoDate,
})

export const committeeVoteSchema = z.object({
  userId: z.string(),
  vote: z.enum(["approve", "decline"]),
  at: isoDate,
})

export const workflowStateSchema = z.object({
  definitionId: z.string(),
  definitionVersion: z.number().int(),
  /** Stage keys this application will pass through, fixed at submission. */
  route: z.array(z.string()),
  currentStageKey: z.string().nullable(),
  stageEnteredAt: isoDate.nullable(),
  /** Approvals collected so far at a parallel stage. */
  stageApprovals: z.array(stageApprovalSchema),
  /** Votes cast so far at a committee stage. */
  stageVotes: z.array(committeeVoteSchema).default([]),
  decisions: z.array(decisionSchema),
})

export const delegationSchema = z.object({
  id: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  startsAt: isoDate,
  endsAt: isoDate,
  reason: z.string(),
})

export const decisionInputSchema = z.object({
  action: decisionActionSchema,
  reasonCode: z.string().min(1, "Select a reason"),
  comment: z.string().trim().min(10, "Add a comment of at least 10 characters explaining the decision").max(2000),
})
