import { nairaToKobo } from "@/lib/format/money"
import type { Collateral, Guarantor, NewApplicationInput, NextOfKin } from "../../types"
import type { DocumentDraft } from "./parties-step"
import type { FormValues } from "./schema"

export interface IntakeExtras {
  guarantors: Guarantor[]
  nextOfKin: NextOfKin | null
  documents: DocumentDraft[]
  collateral: Collateral[]
  asDraft: boolean
}

export function toInput(v: FormValues, extras: IntakeExtras): NewApplicationInput {
  const k = (s?: string) => nairaToKobo(Number(s ?? 0))
  const common = { phone: v.phone, email: v.email, address: v.address, state: v.state }
  return {
    segment: v.segment,
    productId: v.productId,
    amountRequested: k(v.amount),
    tenorMonths: Number(v.tenor),
    purpose: v.purpose,
    branchId: v.branchId,
    agentId: v.agentId && v.agentId !== "none" ? v.agentId : null,
    accountNumber: v.accountNumber,
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
    ...extras,
    collateral: v.segment === "sme" ? extras.collateral : [],
  }
}
