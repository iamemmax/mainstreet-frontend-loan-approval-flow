import type { Field } from "./schema"

export const STEPS = [
  { id: "loan", label: "Loan", hint: "Product, amount and tenor" },
  { id: "applicant", label: "Applicant", hint: "Current account, identity and contact" },
  { id: "income", label: "Income", hint: "Employment or business financials" },
  { id: "parties", label: "Guarantors", hint: "Guarantors, next of kin, collateral" },
  { id: "documents", label: "Documents", hint: "Required uploads" },
  { id: "review", label: "Review", hint: "Check everything, then submit" },
] as const

export const STEP_FIELDS: Record<"retail" | "sme", Field[][]> = {
  retail: [
    ["segment", "productId", "amount", "tenor", "purpose", "branchId"],
    [
      "accountNumber",
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "bvn",
      "nin",
      "phone",
      "email",
      "address",
      "state",
    ],
    ["employerName", "empSector", "jobTitle", "monthlyNetIncome", "employmentStartDate", "salaryBank"],
    [],
    [],
    [],
  ],
  sme: [
    ["segment", "productId", "amount", "tenor", "purpose", "branchId"],
    [
      "accountNumber",
      "businessName",
      "rcNumber",
      "tin",
      "sector",
      "yearsInOperation",
      "promoterName",
      "promoterBvn",
      "promoterNin",
      "phone",
      "email",
      "address",
      "state",
    ],
    ["monthlyRevenue", "monthlyExpenses", "annualTurnover", "primaryBank"],
    [],
    [],
    [],
  ],
}

export const APPLICANT_STEP = 1

export const INCOME_STEP = 2

export const PARTIES_STEP = 3

export const DOCUMENTS_STEP = 4
