import { z } from "zod"
import { GUARANTOR_LIMITS, MAX_STATEMENTS } from "../../schemas/business"

/**
 * The lists on the intake form (guarantors, collateral, documents, statements) and the next of kin, each
 * validated by react-hook-form like every other field. Messages are written for the officer.
 */

const PHONE = /^(\+234|0)[789]\d{9}$/

const ownerSchema = z.object({ role: z.enum(["borrower", "other"]), name: z.string() }).nullable()
type FormOwner = z.infer<typeof ownerSchema>

/** What's wrong with an owner, or null if it's fine: it must be chosen, and someone else needs a full name. */
export function ownerProblem(owner: FormOwner): string | null {
  if (!owner) return "Choose who it belongs to"
  if (owner.name.trim().length < 3) return "Enter the owner's full name"
  return null
}

/** The fields a guarantor and the next of kin share: found by BVN, then how to reach them. */
const personFields = {
  name: z.string(),
  bvn: z.string().nullable(),
  /** ISO date, from the BVN record. */
  dateOfBirth: z.string().nullable(),
  gender: z.enum(["male", "female"]).nullable(),
  relationship: z.string().min(1, "Choose the relationship"),
  phone: z.string().regex(PHONE, "Enter a Nigerian mobile number"),
  address: z.string().trim().min(5, "Enter the address"),
}

/** A person counts as found once their BVN has been looked up and the register gave a date of birth. */
function requireLookup(person: { bvn: string | null; dateOfBirth: string | null }, ctx: z.RefinementCtx) {
  if (!person.bvn || !person.dateOfBirth) {
    ctx.addIssue({ code: "custom", path: ["bvn"], message: "Enter a BVN to look the person up" })
  }
}

export const guarantorFormSchema = z
  .object({
    ...personFields,
    occupation: z.string().trim().min(2, "Enter the occupation"),
    /** Kobo. */
    monthlyIncome: z.number().nullable(),
  })
  .superRefine(requireLookup)

export const nextOfKinFormSchema = z.object(personFields).superRefine(requireLookup)

export const collateralFormSchema = z
  .object({
    type: z.string().min(1, "Choose the collateral type"),
    description: z.string().trim().min(3, "Describe the collateral"),
    /** Kobo. */
    estimatedValue: z.number().positive("Enter the estimated value"),
    /** Kobo. */
    forcedSaleValue: z.number().nullable(),
    files: z.array(z.object({ url: z.string(), fileName: z.string() })).min(1, "Add at least one photo or document"),
    owner: ownerSchema,
  })
  .superRefine((item, ctx) => {
    const problem = ownerProblem(item.owner)
    if (problem) ctx.addIssue({ code: "custom", path: ["owner"], message: problem })
  })

export const documentFormSchema = z
  .object({
    type: z.enum([
      "id_card",
      "bank_statement",
      "payslip",
      "utility_bill",
      "cac_certificate",
      "management_accounts",
      "collateral",
      "guarantor_form",
      "other",
    ]),
    fileName: z.string(),
    sizeBytes: z.number(),
    description: z.string().nullable(),
    owner: ownerSchema,
    bank: z.string().nullable(),
  })
  .superRefine((doc, ctx) => {
    if ((doc.description ?? "").trim().length < 3) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "Say what the document is" })
    }
    const problem = ownerProblem(doc.owner)
    if (problem) ctx.addIssue({ code: "custom", path: ["owner"], message: problem })
  })

/** A statement of account on the form, with the bank analysis read from it (null until it has). */
export const statementFormSchema = z.object({
  fileName: z.string(),
  sizeBytes: z.number(),
  bank: z.string().nullable(),
})

/** The lists as they sit in the form. Segment-specific rules (statements for SME) are in the form schema. */
export const listFields = {
  guarantors: z
    .array(guarantorFormSchema)
    .min(GUARANTOR_LIMITS.min, `Add at least ${GUARANTOR_LIMITS.min} guarantors`)
    .max(GUARANTOR_LIMITS.max, `Add at most ${GUARANTOR_LIMITS.max} guarantors`),
  nextOfKin: nextOfKinFormSchema,
  collateral: z.array(collateralFormSchema),
  documents: z.array(documentFormSchema).min(1, "Upload at least one document"),
  statements: z.array(statementFormSchema).max(MAX_STATEMENTS, `Upload at most ${MAX_STATEMENTS} statements`),
}

export type GuarantorValues = z.infer<typeof guarantorFormSchema>
export type NextOfKinValues = z.infer<typeof nextOfKinFormSchema>
export type CollateralValues = z.infer<typeof collateralFormSchema>
export type DocumentDraft = z.infer<typeof documentFormSchema>
export type UploadedStatement = z.infer<typeof statementFormSchema>

export const emptyGuarantor = (): GuarantorValues => ({
  name: "",
  bvn: null,
  dateOfBirth: null,
  gender: null,
  relationship: "",
  phone: "",
  address: "",
  occupation: "",
  monthlyIncome: null,
})

export const emptyNextOfKin = (): NextOfKinValues => ({
  name: "",
  bvn: null,
  dateOfBirth: null,
  gender: null,
  relationship: "",
  phone: "",
  address: "",
})

export const emptyCollateral = (): CollateralValues => ({
  type: "",
  description: "",
  estimatedValue: 0,
  forcedSaleValue: null,
  files: [],
  owner: null,
})
