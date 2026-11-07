import { koboToNaira } from "@/lib/format/money"
import type { Application } from "../../types"
import { applicantValues } from "./account-lookup"
import type { FormValues } from "./schema"

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
