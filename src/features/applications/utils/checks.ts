import type { Application, VerificationResult } from "../types"

/** Every KYC, bureau and screening check an application must pass before assessment. */
export function requiredChecks(app: Pick<Application, "segment">): VerificationResult["kind"][] {
  return [
    "bvn",
    "nin",
    "phone",
    app.segment === "sme" ? "cac" : "employer",
    "bank_statement",
    "bureau_crc",
    "bureau_firstcentral",
    "bureau_creditregistry",
    "pep_sanctions",
    "blacklist",
  ]
}
