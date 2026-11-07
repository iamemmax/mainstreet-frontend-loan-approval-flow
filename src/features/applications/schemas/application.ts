import { z } from "zod"
import { isoDate, koboSchema, paginatedSchema, sortDirSchema } from "@/lib/api/schemas"
import { segmentSchema, workflowStateSchema } from "@/features/workflow/schemas/workflow"
import { applicationStatusSchema, riskRatingSchema, slaStateSchema } from "./status"

export const genderSchema = z.enum(["male", "female"])

export const individualApplicantSchema = z.object({
  kind: z.literal("individual"),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  gender: genderSchema,
  bvn: z.string().regex(/^\d{11}$/),
  nin: z.string().regex(/^\d{11}$/),
  phone: z.string(),
  email: z.email(),
  address: z.string(),
  state: z.string(),
})

export const businessApplicantSchema = z.object({
  kind: z.literal("business"),
  businessName: z.string(),
  rcNumber: z.string(),
  tin: z.string(),
  sector: z.string(),
  /** What the business trades, makes or does, from the sector's own list (see BUSINESS_SECTORS). */
  activity: z.string(),
  yearsInOperation: z.number().int().nonnegative(),
  address: z.string(),
  state: z.string(),
  phone: z.string(),
  email: z.email(),
  /** Principal promoter / director whose BVN anchors the KYC. */
  promoter: z.object({
    name: z.string(),
    bvn: z.string().regex(/^\d{11}$/),
    nin: z.string().regex(/^\d{11}$/),
  }),
})

export const applicantSchema = z.discriminatedUnion("kind", [individualApplicantSchema, businessApplicantSchema])

/** A NUBAN account number: 10 digits. */
export const accountNumberSchema = z.string().regex(/^\d{10}$/, "Account number must be 10 digits")

/** A customer's current account at the bank, as core banking returns it. */
export const customerAccountSchema = z.object({
  accountNumber: accountNumberSchema,
  accountName: z.string(),
  /** ISO date (no time) the account was opened. */
  openedOn: z.string(),
  /** Only an active account can take a loan; a dormant one has to be reactivated first. */
  status: z.enum(["active", "dormant"]),
  /** The holder's KYC record: a person on a personal account, a business on a corporate one. */
  holder: applicantSchema,
})

export const employmentSchema = z.object({
  employerName: z.string(),
  sector: z.string(),
  jobTitle: z.string(),
  monthlyNetIncome: koboSchema,
  employmentStartDate: z.string(),
  salaryBank: z.string(),
})

export const businessFinancialsSchema = z.object({
  monthlyRevenue: koboSchema,
  monthlyExpenses: koboSchema,
  annualTurnover: koboSchema,
  primaryBank: z.string(),
})

export const guarantorSchema = z.object({
  name: z.string().trim().min(3),
  relationship: z.string().trim().min(2),
  phone: z.string(),
  address: z.string().trim().min(5),
  occupation: z.string().trim().min(2),
  monthlyIncome: koboSchema.nullable(),
  bvn: z
    .string()
    .regex(/^\d{11}$/)
    .nullable(),
  /** ISO date, from the BVN record. */
  dateOfBirth: z.string().nullable(),
  gender: genderSchema.nullable(),
})

export const nextOfKinSchema = z.object({
  name: z.string().trim().min(3),
  relationship: z.string().trim().min(2),
  phone: z.string(),
  address: z.string().trim().min(5),
  bvn: z
    .string()
    .regex(/^\d{11}$/)
    .nullable(),
  /** ISO date, from the BVN record. */
  dateOfBirth: z.string().nullable(),
  gender: genderSchema.nullable(),
})

/** A person's details as the BVN register holds them, used to fill in guarantors and next of kin. */
export const bvnRecordSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  /** ISO date. */
  dateOfBirth: z.string(),
  gender: genderSchema,
  phone: z.string(),
  address: z.string(),
})

export const DOCUMENT_TYPES = [
  "id_card",
  "bank_statement",
  "payslip",
  "utility_bill",
  "cac_certificate",
  "management_accounts",
  "collateral",
  "guarantor_form",
  "other",
] as const
export const documentTypeSchema = z.enum(DOCUMENT_TYPES)

export const DOCUMENT_TYPE_LABELS: Record<z.infer<typeof documentTypeSchema>, string> = {
  id_card: "Valid ID",
  bank_statement: "Bank statement",
  payslip: "Payslip",
  utility_bill: "Utility bill",
  cac_certificate: "CAC certificate",
  management_accounts: "Management accounts",
  collateral: "Collateral document",
  guarantor_form: "Guarantor form",
  other: "Other",
}

/** Who a document or a piece of collateral belongs to: the borrower, or someone else the officer names. */
export const ownerSchema = z.object({
  role: z.enum(["borrower", "other"]),
  name: z.string().trim().min(1),
})

export const documentSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: isoDate,
  uploadedById: z.string(),
  /** Where the file can be opened. A real backend returns a short-lived signed link; null if not available. */
  url: z.string().nullable().default(null),
  /** What the document is, in the officer's words, e.g. "Payslips for July to September". */
  description: z.string().nullable(),
  owner: ownerSchema.nullable(),
  /** The bank that issued a statement of account; null for every other document. */
  bank: z.string().nullable(),
})

/** One uploaded statement of account. Analysis reads which bank issued it. */
export const statementUploadSchema = z.object({
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
})

/** Body for POST /statements/analysis: an SME's statements, one per bank, and the loan they're for. */
export const statementAnalysisInputSchema = z.object({
  amountRequested: koboSchema,
  tenorMonths: z.number().int().positive(),
  statements: z.array(statementUploadSchema).min(1),
})

/** What statement analysis reads from the statements: each bank's flows and the business's monthly averages. */
export const statementAnalysisSchema = z.object({
  /** One entry per statement, in the order they were sent. */
  banks: z.array(
    z.object({
      fileName: z.string(),
      /** The bank that issued the statement, read from the statement itself. */
      bank: z.string(),
      /** Kobo, average a month. */
      monthlyInflow: koboSchema,
      /** Kobo, average a month. */
      monthlyOutflow: koboSchema,
    }),
  ),
  /** Kobo: inflows across every bank, average a month. */
  monthlyRevenue: koboSchema,
  /** Kobo: outflows across every bank, average a month. */
  monthlyExpenses: koboSchema,
  /** Kobo: twelve months of revenue. */
  annualTurnover: koboSchema,
  /** The bank with the most money coming in. */
  primaryBank: z.string(),
})

export const collateralSchema = z.object({
  type: z.string().trim().min(2),
  description: z.string().trim().min(3),
  estimatedValue: koboSchema,
  forcedSaleValue: koboSchema.nullable(),
  /**
   * Photos of the asset and documents about it (images or PDFs), at least one to submit.
   * Data URLs from intake until the real API stores uploads.
   */
  files: z.array(z.object({ url: z.string(), fileName: z.string() })),
  /** Who owns the asset. */
  owner: ownerSchema.nullable(),
})

export const VERIFICATION_CHECKS = [
  "bvn",
  "nin",
  "phone",
  "cac",
  "employer",
  "bank_statement",
  "bureau_crc",
  "bureau_firstcentral",
  "bureau_creditregistry",
  "pep_sanctions",
  "blacklist",
] as const
export const verificationCheckKindSchema = z.enum(VERIFICATION_CHECKS)
export const verificationResultSchema = z.object({
  kind: verificationCheckKindSchema,
  status: z.enum(["passed", "failed", "review"]),
  detail: z.string(),
  provider: z.string(),
  at: isoDate,
})

export const assessmentSchema = z.object({
  monthlyExpenses: koboSchema,
  existingLoanRepayments: koboSchema,
  recommendation: z.enum(["approve", "decline", "refer"]).nullable(),
  notes: z.string(),
  updatedAt: isoDate,
  updatedById: z.string(),
})

/**
 * One issued offer. Each send creates a new record with its own number and an
 * unguessable link token; sending again supersedes the previous link.
 */
export const offerRecordSchema = z.object({
  id: z.string(),
  /** Human reference quoted to the customer, e.g. OFR-2610-00042. */
  number: z.string(),
  /** The secret in the customer's link. Never derived from the application id. */
  token: z.string().min(32),
  /** The terms this offer was issued on, so an older link always shows its own numbers. */
  amount: koboSchema,
  tenorMonths: z.number().int().positive(),
  sentAt: isoDate,
  sentById: z.string(),
  expiresAt: isoDate,
  status: z.enum(["sent", "accepted", "declined", "superseded"]),
  respondedAt: isoDate.nullable(),
})

/** Staff discussion on an application. Rejections and returns before approval carry their reason. */
export const applicationMessageSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  body: z.string().min(1).max(2000),
  at: isoDate,
  kind: z.enum(["message", "rejection", "return"]),
  reasonCode: z.string().nullable(),
})

export const messageInputSchema = z.object({
  body: z.string().trim().min(1, "Write a message first").max(2000, "Keep it under 2,000 characters"),
})

/**
 * Face check for the applicant (the promoter, for a business): the selfie taken at
 * application against the photo on the BVN record. `faceMatch` is the provider's
 * similarity score (0-100), set when the BVN check runs.
 */
export const identityPhotosSchema = z.object({
  selfieUrl: z.string().nullable(),
  bvnPhotoUrl: z.string().nullable(),
  selfieCapturedAt: isoDate.nullable(),
  faceMatch: z.number().min(0).max(100).nullable(),
})

/** Terms the bank offers when they differ from what was asked for, e.g. a smaller amount. */
export const offerTermsSchema = z.object({
  amount: koboSchema,
  tenorMonths: z.number().int().positive(),
  reason: z.string(),
  setById: z.string(),
  setAt: isoDate,
})

export const adjustOfferInputSchema = z.object({
  amount: koboSchema,
  tenorMonths: z.number().int().positive(),
  reason: z.string().trim().min(10, "Explain the change in at least 10 characters").max(500),
})

export const LENDER_TYPES = ["bank", "mfb", "digital", "cooperative", "other"] as const
export const FACILITY_STATUSES = ["performing", "late_30", "late_60", "late_90", "written_off", "closed"] as const
export const BUREAUS = ["crc", "firstcentral", "creditregistry"] as const

/** One loan or credit line the borrower has (or had) with another lender, as the bureaus report it. */
export const creditFacilitySchema = z.object({
  id: z.string(),
  lender: z.string(),
  lenderType: z.enum(LENDER_TYPES),
  facilityType: z.string(),
  amount: koboSchema,
  outstanding: koboSchema,
  monthlyRepayment: koboSchema,
  status: z.enum(FACILITY_STATUSES),
  daysPastDue: z.number().int().nonnegative(),
  openedAt: isoDate,
  lastReportedAt: isoDate,
  bureaus: z.array(z.enum(BUREAUS)).min(1),
})

/** The borrower's credit report from the bureaus, pulled during verification. */
export const creditHistorySchema = z.object({
  pulledAt: isoDate,
  facilities: z.array(creditFacilitySchema),
  /** Other lenders that searched the borrower's record in the last 6 months: many means they're shopping for credit. */
  enquiries6m: z.number().int().nonnegative(),
})

export const APPLICATION_FLAGS = [
  "duplicate_applicant",
  "bvn_failed",
  "pep_hit",
  "self_approval_attempt",
  "auto_escalated",
] as const
export const applicationFlagSchema = z.enum(APPLICATION_FLAGS)

export const applicationSchema = z.object({
  id: z.string(),
  reference: z.string(),
  segment: segmentSchema,
  productId: z.string(),
  status: applicationStatusSchema,
  amountRequested: koboSchema,
  tenorMonths: z.number().int().positive(),
  purpose: z.string(),
  applicant: applicantSchema,
  /** The customer's current account at the bank, where the loan is paid. */
  accountNumber: accountNumberSchema,
  /** What the customer's business does, in the officer's words. Optional for Retail. */
  businessDescription: z.string().nullable(),
  /** Where the business operates; for SME, where it trades rather than its registered address. */
  businessAddress: z.string().nullable(),
  employment: employmentSchema.nullable(),
  business: businessFinancialsSchema.nullable(),
  branchId: z.string(),
  officerId: z.string(),
  agentId: z.string().nullable(),
  createdById: z.string(),
  createdAt: isoDate,
  submittedAt: isoDate.nullable(),
  updatedAt: isoDate,
  riskRating: riskRatingSchema.nullable(),
  score: z.number().int().min(0).max(1000).nullable(),
  workflow: workflowStateSchema.nullable(),
  flags: z.array(applicationFlagSchema),
  duplicateOfId: z.string().nullable(),
  guarantors: z.array(guarantorSchema).default([]),
  nextOfKin: nextOfKinSchema.nullable().default(null),
  documents: z.array(documentSchema).default([]),
  collateral: z.array(collateralSchema).default([]),
  verification: z.array(verificationResultSchema).default([]),
  assessment: assessmentSchema.nullable().default(null),
  /** Every offer issued, oldest first. The last one is the current offer. */
  offers: z.array(offerRecordSchema).default([]),
  messages: z.array(applicationMessageSchema).default([]),
  offerTerms: offerTermsSchema.nullable().default(null),
  creditHistory: creditHistorySchema.nullable().default(null),
  identity: identityPhotosSchema.default({
    selfieUrl: null,
    bvnPhotoUrl: null,
    selfieCapturedAt: null,
    faceMatch: null,
  }),
})

/** Row shape for lists and queues — joined and pre-computed by the API. */
export const applicationListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  segment: segmentSchema,
  applicantName: z.string(),
  productId: z.string(),
  productName: z.string(),
  status: applicationStatusSchema,
  amountRequested: koboSchema,
  tenorMonths: z.number().int(),
  /** Priced with the product's terms, so the list can show what the borrower repays. */
  monthlyRepayment: koboSchema,
  totalInterest: koboSchema,
  /** What the bank is offering; less than requested when an approver reduced it. */
  offeredAmount: koboSchema,
  branchId: z.string(),
  branchName: z.string(),
  officerId: z.string(),
  officerName: z.string(),
  agentName: z.string().nullable(),
  riskRating: riskRatingSchema.nullable(),
  currentStageKey: z.string().nullable(),
  currentStageName: z.string().nullable(),
  sla: z
    .object({
      state: slaStateSchema,
      dueAt: isoDate,
    })
    .nullable(),
  flags: z.array(applicationFlagSchema),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const applicationListSchema = paginatedSchema(applicationListItemSchema)

export const APPLICATION_SORT_FIELDS = [
  "reference",
  "applicantName",
  "amountRequested",
  "status",
  "createdAt",
  "updatedAt",
  "slaDueAt",
] as const

/** Query params for GET /applications — shared by the URL state, the client and the mock server. */
export const applicationListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  sort: z.enum(APPLICATION_SORT_FIELDS).default("updatedAt"),
  dir: sortDirSchema.default("desc"),
  q: z.string().optional(),
  status: z.array(applicationStatusSchema).optional(),
  segment: z.array(segmentSchema).optional(),
  stage: z.array(z.string()).optional(),
  productId: z.array(z.string()).optional(),
  branchId: z.array(z.string()).optional(),
  officerId: z.array(z.string()).optional(),
  agentId: z.array(z.string()).optional(),
  risk: z.array(riskRatingSchema).optional(),
  sla: z.array(slaStateSchema).optional(),
  minAmount: z.coerce.number().int().nonnegative().optional(),
  maxAmount: z.coerce.number().int().nonnegative().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

/** Body for POST /applications. The server assigns ids, reference, officer and status. */
export const newApplicationInputSchema = z.object({
  segment: segmentSchema,
  productId: z.string().min(1),
  amountRequested: koboSchema.positive(),
  tenorMonths: z.number().int().positive(),
  purpose: z.string().trim().min(3),
  branchId: z.string().min(1),
  agentId: z.string().nullable(),
  /** The current account the applicant's details were taken from. */
  accountNumber: accountNumberSchema,
  applicant: applicantSchema,
  businessDescription: z.string().trim().nullable(),
  businessAddress: z.string().trim().nullable(),
  employment: employmentSchema.nullable(),
  business: businessFinancialsSchema.nullable(),
  guarantors: z.array(guarantorSchema),
  nextOfKin: nextOfKinSchema.nullable(),
  documents: z.array(documentSchema.omit({ id: true, uploadedAt: true, uploadedById: true, url: true })),
  collateral: z.array(collateralSchema),
  /** Drafts skip completeness checks and stay with the officer until submitted. */
  asDraft: z.boolean(),
})

export const APPLICATION_TRANSITIONS = [
  "submit_draft",
  "start_verification",
  "complete_verification",
  "submit_for_approval",
  "resubmit",
  "send_offer",
  "resend_offer",
  "mark_ready",
] as const
export const applicationTransitionSchema = z.enum(APPLICATION_TRANSITIONS)

/** Everything the customer sees on their offer link. */
export const offerViewSchema = z.object({
  reference: z.string(),
  offerNumber: z.string(),
  /** Whether this particular link can still be acted on. */
  linkStatus: z.enum(["active", "expired", "superseded", "accepted", "declined"]),
  applicantName: z.string(),
  productName: z.string(),
  status: applicationStatusSchema,
  /** What the customer asked for, shown when the offer is for less. */
  requestedAmount: koboSchema,
  requestedTenorMonths: z.number().int(),
  principal: koboSchema,
  tenorMonths: z.number().int(),
  monthlyRateBps: z.number().int(),
  totalInterest: koboSchema,
  fees: z.array(z.object({ code: z.string(), label: z.string(), amount: koboSchema })),
  totalFees: koboSchema,
  monthlyRepayment: koboSchema,
  totalRepayable: koboSchema,
  branchName: z.string(),
  expiresAt: isoDate,
})
