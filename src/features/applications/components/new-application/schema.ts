import type { FieldPath } from "react-hook-form"
import { z } from "zod"

export const digits = (n: number, label: string) =>
  z.string().regex(new RegExp(`^\\d{${n}}$`), `${label} must be ${n} digits`)

const money = z.string().regex(/^\d+$/, "Enter an amount in naira")

const opt = z.string().optional()

export const formSchema = z
  .object({
    segment: z.enum(["retail", "sme"]),
    productId: z.string().min(1, "Choose a product"),
    amount: money,
    tenor: z.string().regex(/^\d+$/, "Enter the tenor in months"),
    purpose: z.string().trim().min(3, "Describe what the loan is for"),
    branchId: z.string().min(1, "Choose a branch"),
    accountNumber: digits(10, "Account number"),
    phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, "Enter a Nigerian mobile number"),
    email: z.email("Enter a valid email"),
    address: z.string().trim().min(5, "Enter the address"),
    state: z.string().trim().min(2, "Enter the state"),
    firstName: opt,
    middleName: opt,
    lastName: opt,
    dateOfBirth: opt,
    gender: opt,
    bvn: opt,
    nin: opt,
    businessName: opt,
    rcNumber: opt,
    tin: opt,
    sector: opt,
    activity: opt,
    yearsInOperation: opt,
    businessDescription: opt,
    businessAddress: opt,
    promoterName: opt,
    promoterBvn: opt,
    promoterNin: opt,
    employerName: opt,
    empSector: opt,
    jobTitle: opt,
    monthlyNetIncome: opt,
    employmentStartDate: opt,
    salaryBank: opt,
    monthlyRevenue: opt,
    monthlyExpenses: opt,
    annualTurnover: opt,
    primaryBank: opt,
  })
  .superRefine((v, ctx) => {
    const need = (key: keyof typeof v, message: string, schema: z.ZodType = z.string().trim().min(1)) => {
      if (!schema.safeParse(v[key] ?? "").success) ctx.addIssue({ code: "custom", path: [key], message })
    }
    if (v.segment === "retail") {
      need("firstName", "Enter the first name")
      need("lastName", "Enter the last name")
      need("dateOfBirth", "Enter the date of birth")
      need("gender", "Choose a gender")
      need("bvn", "BVN must be 11 digits", digits(11, "BVN"))
      need("nin", "NIN must be 11 digits", digits(11, "NIN"))
      need("employerName", "Enter the employer")
      need("empSector", "Enter the sector")
      need("jobTitle", "Enter the job title")
      need("monthlyNetIncome", "Enter the monthly net income", money)
      need("employmentStartDate", "Enter the start date")
      need("salaryBank", "Choose the salary bank")
    } else {
      need("businessName", "Enter the business name")
      need("rcNumber", "Enter the RC number")
      need("tin", "Enter the TIN")
      need("sector", "Choose the sector")
      need("activity", "Choose what the business does")
      need("businessDescription", "Describe the business", z.string().trim().min(10))
      need("businessAddress", "Enter the business address", z.string().trim().min(5))
      need("yearsInOperation", "Enter years in operation", z.string().regex(/^\d+$/))
      need("promoterName", "Enter the promoter's name")
      need("promoterBvn", "BVN must be 11 digits", digits(11, "BVN"))
      need("promoterNin", "NIN must be 11 digits", digits(11, "NIN"))
      // Filled in by statement analysis, not typed.
      need("monthlyRevenue", "Analyse the statements", money)
      need("monthlyExpenses", "Analyse the statements", money)
      need("annualTurnover", "Analyse the statements", money)
      need("primaryBank", "Analyse the statements")
    }
  })

export type FormValues = z.infer<typeof formSchema>

export type Field = FieldPath<FormValues>
