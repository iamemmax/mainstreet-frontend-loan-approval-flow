import type { Session } from "@/features/auth/types"
import { MAX_STATEMENTS } from "@/features/applications/schemas/business"
import type { StatementAnalysis, StatementAnalysisInput, StatementUpload } from "@/features/applications/types"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"
import { requirePermission } from "./actions"

/** How each bank tends to appear in a statement's file name. The real provider reads the statement's header. */
const BANK_NAME_HINTS: Record<string, string[]> = {
  "Access Bank": ["access"],
  Ecobank: ["ecobank"],
  FCMB: ["fcmb"],
  "Fidelity Bank": ["fidelity"],
  "First Bank": ["firstbank", "first-bank", "first_bank", "first bank"],
  GTBank: ["gtbank", "gtb", "guaranty"],
  "Keystone Bank": ["keystone"],
  "Kuda MFB": ["kuda"],
  "Mainstreet MFB": ["mainstreet"],
  "Moniepoint MFB": ["moniepoint"],
  Opay: ["opay"],
  PalmPay: ["palmpay"],
  "Polaris Bank": ["polaris"],
  "Stanbic IBTC": ["stanbic"],
  "Sterling Bank": ["sterling"],
  UBA: ["uba"],
  "Union Bank": ["unionbank", "union-bank", "union_bank", "union bank"],
  "Wema Bank": ["wema", "alat"],
  "Zenith Bank": ["zenith"],
}

/**
 * Reads an SME's statements of account: which bank issued each one, each bank's average monthly money in and
 * out, and the totals the affordability check runs on. The real provider reads the files; the mock has no file
 * contents, so it takes the bank from the file name where it can, and gives each statement steady figures from
 * its name and size, sized so a typical loan is affordable.
 */
export function analyseStatements(
  store: MockStore,
  session: Session,
  input: StatementAnalysisInput,
): StatementAnalysis {
  requirePermission(session, "application:create")
  if (input.statements.length > MAX_STATEMENTS) {
    throw new ApiError(422, "too_many_statements", `Upload at most ${MAX_STATEMENTS} statements, one per bank`)
  }
  const banks = issuingBanks(input.statements, store.reference.banks)
  const repeated = banks.find((bank, i) => banks.indexOf(bank) !== i)
  if (repeated) {
    throw new ApiError(422, "duplicate_bank", `Two statements are from ${repeated}. Upload one statement per bank`)
  }

  // Enough money in that, after outflows, the loan's repayment is usually well within the 40% limit.
  const monthlyCost = input.amountRequested / input.tenorMonths
  const perBank = (monthlyCost * 18) / input.statements.length
  const flows = input.statements.map((statement, i) => bankFlows(statement, banks[i], perBank))

  let monthlyRevenue = 0
  let monthlyExpenses = 0
  for (const flow of flows) {
    monthlyRevenue += flow.monthlyInflow
    monthlyExpenses += flow.monthlyOutflow
  }
  const primary = flows.reduce((best, flow) => (flow.monthlyInflow > best.monthlyInflow ? flow : best))
  return {
    banks: flows,
    monthlyRevenue,
    monthlyExpenses,
    annualTurnover: monthlyRevenue * 12,
    primaryBank: primary.bank,
  }
}

/** The bank behind each statement: named in the file name, or else one of the banks not yet used. */
function issuingBanks(statements: StatementUpload[], allBanks: string[]): string[] {
  const named = statements.map((statement) => bankInFileName(statement.fileName))
  const result: string[] = []
  for (let i = 0; i < statements.length; i++) {
    const bank = named[i]
    if (bank) {
      result.push(bank)
      continue
    }
    const unused = allBanks.filter((option) => !named.includes(option) && !result.includes(option))
    const seed = stableNumber(`${statements[i].fileName}|${statements[i].sizeBytes}`)
    result.push(unused[seed % unused.length] ?? allBanks[seed % allBanks.length])
  }
  return result
}

function bankInFileName(fileName: string): string | null {
  const name = fileName.toLowerCase()
  for (const [bank, hints] of Object.entries(BANK_NAME_HINTS)) {
    if (hints.some((hint) => name.includes(hint))) return bank
  }
  return null
}

/** One bank's average monthly flows: between 0.7 and 1.6 times its share, with outflows at 50–70% of inflows. */
function bankFlows(statement: StatementUpload, bank: string, perBank: number) {
  const seed = stableNumber(`${bank}|${statement.fileName}|${statement.sizeBytes}`)
  const inflow = roundToThousandNaira(perBank * (0.7 + (seed % 90) / 100))
  const outflowShare = 0.5 + (Math.floor(seed / 90) % 21) / 100
  return {
    fileName: statement.fileName,
    bank,
    monthlyInflow: inflow,
    monthlyOutflow: roundToThousandNaira(inflow * outflowShare),
  }
}

/** The same whole number every time for the same text. */
function stableNumber(text: string): number {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

/** Kobo, rounded to the nearest ₦1,000. */
function roundToThousandNaira(kobo: number): number {
  return Math.round(kobo / 100_000) * 100_000
}
