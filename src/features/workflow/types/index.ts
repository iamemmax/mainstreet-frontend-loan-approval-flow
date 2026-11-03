import type { z } from "zod"
import type {
  approvalBandSchema,
  committeeVoteSchema,
  decisionActionSchema,
  decisionInputSchema,
  decisionSchema,
  delegationSchema,
  segmentSchema,
  stageApprovalSchema,
  workflowDefinitionSchema,
  workflowStageSchema,
  workflowStateSchema,
} from "../schemas/workflow"

export type Segment = z.infer<typeof segmentSchema>
export type DecisionAction = z.infer<typeof decisionActionSchema>
export type WorkflowStage = z.infer<typeof workflowStageSchema>
export type ApprovalBand = z.infer<typeof approvalBandSchema>
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>
export type Decision = z.infer<typeof decisionSchema>
export type StageApproval = z.infer<typeof stageApprovalSchema>
export type WorkflowState = z.infer<typeof workflowStateSchema>
export type Delegation = z.infer<typeof delegationSchema>
export type CommitteeVote = z.infer<typeof committeeVoteSchema>
export type DecisionInput = z.infer<typeof decisionInputSchema>
