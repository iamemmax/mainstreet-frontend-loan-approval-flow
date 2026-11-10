import { nairaToKobo } from "@/lib/format/money"
import type { NewApplicationInput, Owner } from "../../types"
import {
  collateralFormSchema,
  type DocumentDraft,
  guarantorFormSchema,
  nextOfKinFormSchema,
  type UploadedStatement,
} from "./list-schemas"
import type { FormValues } from "./schema"

/** The borrower's name as captured on the Applicant step: the business, or the person. */
export function borrowerName(values: FormValues): string {
  const name = values.segment === "sme" ? values.businessName : [values.firstName, values.lastName].join(" ")
  return name?.trim() || "Borrower"
}

/** Statements as documents on the application, each owned by the borrower and named after its bank. */
function statementDocuments(statements: UploadedStatement[], borrower: Owner): DocumentDraft[] {
  return statements
    .filter((statement) => statement.bank)
    .map((statement) => ({
      type: "bank_statement",
      fileName: statement.fileName,
      sizeBytes: statement.sizeBytes,
      description: `${statement.bank} statement of account`,
      owner: borrower,
      bank: statement.bank,
    }))
}

/** The guarantors, next of kin, collateral and documents to send. A draft keeps only the complete parties. */
function lists(v: FormValues, asDraft: boolean) {
  const complete = <T>(schema: { safeParse: (value: unknown) => { success: boolean } }, items: T[]) =>
    asDraft ? items.filter((item) => schema.safeParse(item).success) : items
  const borrower: Owner = { role: "borrower", name: borrowerName(v) }
  // Statements belong to SME loans only, in case the segment was changed after uploading.
  const statements = v.segment === "sme" ? statementDocuments(v.statements, borrower) : []
  return {
    guarantors: complete(guarantorFormSchema, v.guarantors),
    nextOfKin: complete(nextOfKinFormSchema, [v.nextOfKin])[0] ?? null,
    collateral: complete(collateralFormSchema, v.collateral).map((item) => ({ ...item, owner: item.owner! })),
    documents: [...statements, ...v.documents].map((doc) => ({ ...doc, description: doc.description?.trim() || null })),
    asDraft,
  }
}

export function toInput(v: FormValues, asDraft: boolean): NewApplicationInput {
  const k = (s?: string) => nairaToKobo(Number(s ?? 0))
  const common = { phone: v.phone, email: v.email, address: v.address, state: v.state }
  return {
    segment: v.segment,
    productId: v.productId,
    amountRequested: k(v.amount),
    tenorMonths: Number(v.tenor),
    purpose: v.purpose,
    branchId: v.branchId,
    // The relationship officer capturing the application is the one who brought it in.
    agentId: null,
    accountNumber: v.accountNumber,
    businessDescription: v.businessDescription?.trim() || null,
    businessAddress: v.businessAddress?.trim() || null,
    applicant:
      v.segment === "retail"
        ? {
            kind: "individual",
            firstName: v.firstName!,
            middleName: v.middleName || null,
            lastName: v.lastName!,
            dateOfBirth: v.dateOfBirth!,
            gender: v.gender as "male" | "female",
            bvn: v.bvn!,
            nin: v.nin!,
            ...common,
          }
        : {
            kind: "business",
            businessName: v.businessName!,
            rcNumber: v.rcNumber!,
            tin: v.tin!,
            sector: v.sector!,
            activity: v.activity!,
            yearsInOperation: Number(v.yearsInOperation),
            promoter: { name: v.promoterName!, bvn: v.promoterBvn!, nin: v.promoterNin! },
            ...common,
          },
    employment:
      v.segment === "retail"
        ? {
            employerName: v.employerName!,
            sector: v.empSector!,
            jobTitle: v.jobTitle!,
            monthlyNetIncome: k(v.monthlyNetIncome),
            employmentStartDate: v.employmentStartDate!,
            salaryBank: v.salaryBank!,
          }
        : null,
    business:
      v.segment === "sme"
        ? {
            monthlyRevenue: k(v.monthlyRevenue),
            monthlyExpenses: k(v.monthlyExpenses),
            annualTurnover: k(v.annualTurnover),
            primaryBank: v.primaryBank!,
          }
        : null,
    ...lists(v, asDraft),
  }
}
