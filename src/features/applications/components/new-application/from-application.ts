import { koboToNaira } from "@/lib/format/money"
import { GUARANTOR_LIMITS } from "../../schemas/business"
import type { Application } from "../../types"
import { applicantValues } from "./account-lookup"
import { emptyGuarantor, emptyNextOfKin } from "./list-schemas"
import type { FormValues } from "./schema"

/** An SME's statements of account sit in their own list on the form, apart from the other documents. */
function isStatement(app: Application, doc: Application["documents"][number]): boolean {
  return app.segment === "sme" && doc.type === "bank_statement" && !!doc.bank
}

/** The lists on the form for a saved draft, with blank guarantors to make up the minimum. */
function listValues(
  app: Application,
): Pick<FormValues, "guarantors" | "nextOfKin" | "collateral" | "documents" | "statements"> {
  const guarantors = [...app.guarantors]
  while (guarantors.length < GUARANTOR_LIMITS.min) guarantors.push(emptyGuarantor())
  const keep = ({ type, fileName, sizeBytes, description, owner, bank }: Application["documents"][number]) => ({
    type,
    fileName,
    sizeBytes,
    description,
    owner,
    bank,
  })
  return {
    guarantors,
    nextOfKin: app.nextOfKin ?? emptyNextOfKin(),
    collateral: app.collateral,
    documents: app.documents.filter((doc) => !isStatement(app, doc)).map(keep),
    statements: app.documents
      .filter((doc) => isStatement(app, doc))
      .map(({ fileName, sizeBytes, bank }) => ({ fileName, sizeBytes, bank })),
  }
}

/** The form's values for a saved draft: the reverse of `toInput`. */
export function formValuesFrom(app: Application): FormValues {
  return {
    segment: app.segment,
    productId: app.productId,
    amount: String(koboToNaira(app.amountRequested)),
    tenor: String(app.tenorMonths),
    purpose: app.purpose,
    branchId: app.branchId,
    accountNumber: app.accountNumber,
    phone: "",
    email: "",
    address: "",
    state: "",
    ...applicantValues(app.applicant),
    // What the officer wrote, not the account's registered address.
    businessDescription: app.businessDescription ?? "",
    businessAddress: app.businessAddress ?? "",
    ...incomeValues(app),
    ...listValues(app),
  }
}

/** Employment for a Retail draft, business financials for an SME one. Amounts back in naira. */
function incomeValues(app: Application): Partial<FormValues> {
  if (app.employment) {
    return {
      employerName: app.employment.employerName,
      empSector: app.employment.sector,
      jobTitle: app.employment.jobTitle,
      monthlyNetIncome: String(koboToNaira(app.employment.monthlyNetIncome)),
      employmentStartDate: app.employment.employmentStartDate,
      salaryBank: app.employment.salaryBank,
    }
  }
  if (app.business) {
    return {
      monthlyRevenue: String(koboToNaira(app.business.monthlyRevenue)),
      monthlyExpenses: String(koboToNaira(app.business.monthlyExpenses)),
      annualTurnover: String(koboToNaira(app.business.annualTurnover)),
      primaryBank: app.business.primaryBank,
    }
  }
  return {}
}
