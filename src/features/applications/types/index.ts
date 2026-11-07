import type { z } from "zod"
import type {
  applicantSchema,
  customerAccountSchema,
  bvnRecordSchema,
  ownerSchema,
  statementAnalysisInputSchema,
  statementAnalysisSchema,
  statementUploadSchema,
  assessmentSchema,
  collateralSchema,
  documentSchema,
  guarantorSchema,
  nextOfKinSchema,
  verificationResultSchema,
  applicationFlagSchema,
  applicationListItemSchema,
  applicationListParamsSchema,
  applicationSchema,
  applicationTransitionSchema,
  businessApplicantSchema,
  businessFinancialsSchema,
  employmentSchema,
  individualApplicantSchema,
  newApplicationInputSchema,
  offerRecordSchema,
  creditFacilitySchema,
  creditHistorySchema,
  offerTermsSchema,
  adjustOfferInputSchema,
  identityPhotosSchema,
  applicationMessageSchema,
  messageInputSchema,
  offerViewSchema,
} from "../schemas/application"

export type { ApplicationStatus, RiskRating, SlaState } from "../schemas/status"

export type Application = z.infer<typeof applicationSchema>
export type ApplicationListItem = z.infer<typeof applicationListItemSchema>
export type ApplicationListParams = z.input<typeof applicationListParamsSchema>
export type ParsedApplicationListParams = z.output<typeof applicationListParamsSchema>
export type ApplicationFlag = z.infer<typeof applicationFlagSchema>
export type Applicant = z.infer<typeof applicantSchema>
export type IndividualApplicant = z.infer<typeof individualApplicantSchema>
export type BusinessApplicant = z.infer<typeof businessApplicantSchema>
export type Employment = z.infer<typeof employmentSchema>
export type BusinessFinancials = z.infer<typeof businessFinancialsSchema>
export type NewApplicationInput = z.infer<typeof newApplicationInputSchema>
export type ApplicationTransition = z.infer<typeof applicationTransitionSchema>
export type OfferView = z.infer<typeof offerViewSchema>
export type Guarantor = z.infer<typeof guarantorSchema>
export type NextOfKin = z.infer<typeof nextOfKinSchema>
export type ApplicationDocument = z.infer<typeof documentSchema>
export type Collateral = z.infer<typeof collateralSchema>
export type VerificationResult = z.infer<typeof verificationResultSchema>
export type Assessment = z.infer<typeof assessmentSchema>
export type OfferRecord = z.infer<typeof offerRecordSchema>
export type ApplicationMessage = z.infer<typeof applicationMessageSchema>
export type MessageInput = z.infer<typeof messageInputSchema>
export type IdentityPhotos = z.infer<typeof identityPhotosSchema>
export type OfferTermsOverride = z.infer<typeof offerTermsSchema>
export type AdjustOfferInput = z.infer<typeof adjustOfferInputSchema>
export type CreditFacility = z.infer<typeof creditFacilitySchema>
export type CreditHistory = z.infer<typeof creditHistorySchema>
export type CustomerAccount = z.infer<typeof customerAccountSchema>
export type BvnRecord = z.infer<typeof bvnRecordSchema>
export type Owner = z.infer<typeof ownerSchema>
export type StatementUpload = z.infer<typeof statementUploadSchema>
export type StatementAnalysisInput = z.infer<typeof statementAnalysisInputSchema>
export type StatementAnalysis = z.infer<typeof statementAnalysisSchema>
