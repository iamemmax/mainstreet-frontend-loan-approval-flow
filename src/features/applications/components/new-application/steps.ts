import type { Field } from "./schema"

export const STEPS = [
  { id: "loan", label: "Loan", hint: "Product, amount and tenor" },
  { id: "applicant", label: "Applicant", hint: "Current account, identity and business" },
  { id: "income", label: "Income", hint: "Employment and salary" },
  { id: "parties", label: "Guarantors", hint: "Guarantors and next of kin" },
  { id: "collateral", label: "Collateral", hint: "Assets pledged against the loan" },
  { id: "documents", label: "Documents", hint: "Uploads, described and owned" },
  { id: "review", label: "Review", hint: "Check everything, then submit" },
] as const

/** The steps as this segment sees them: an SME's third step is its statements of account. */
export function stepsFor(segment: "retail" | "sme") {
  if (segment === "retail") return STEPS
  return STEPS.map((step) =>
    step.id === "income" ? { ...step, label: "Statements", hint: "Statements of account, up to 6 banks" } : step,
  )
}

const LOAN_FIELDS: Field[] = ["segment", "productId", "amount", "tenor", "purpose", "branchId"]
const CONTACT_FIELDS: Field[] = ["phone", "email", "address", "state"]

/** The form fields checked before leaving each step. A list's name checks every item in it. */
export const STEP_FIELDS: Record<"retail" | "sme", Field[][]> = {
  retail: [
    LOAN_FIELDS,
    [
      "accountNumber",
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "bvn",
      "nin",
      ...CONTACT_FIELDS,
      "businessDescription",
      "businessAddress",
    ],
    ["employerName", "empSector", "jobTitle", "monthlyNetIncome", "employmentStartDate", "salaryBank"],
    ["guarantors", "nextOfKin"],
    ["collateral"],
    ["documents"],
    [],
  ],
  sme: [
    LOAN_FIELDS,
    [
      "accountNumber",
      "businessName",
      "rcNumber",
      "tin",
      "sector",
      "activity",
      "yearsInOperation",
      "promoterName",
      "promoterBvn",
      "promoterNin",
      ...CONTACT_FIELDS,
      "businessDescription",
      "businessAddress",
    ],
    // Reading the statements fills in the financials.
    ["statements", "monthlyRevenue"],
    ["guarantors", "nextOfKin"],
    ["collateral"],
    ["documents"],
    [],
  ],
}

export const APPLICANT_STEP = 1

export const INCOME_STEP = 2

export const PARTIES_STEP = 3

export const COLLATERAL_STEP = 4

export const DOCUMENTS_STEP = 5
