import type { Applicant } from "../types"

/** The BVN that anchors the applicant's KYC: the person's own, or the business promoter's. */
export function applicantBvn(applicant: Applicant): string {
  return applicant.kind === "individual" ? applicant.bvn : applicant.promoter.bvn
}
