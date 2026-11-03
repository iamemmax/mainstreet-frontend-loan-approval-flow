import type { Session } from "@/features/auth/types"
import type { NewApplicationInput } from "@/features/applications/types"
import { applicantBvn } from "@/features/applications/utils/applicant"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"
import { requirePermission } from "./actions"

/** Finds a current account by number, for filling in a new application. Core banking in the real system. */
export function findAccount(store: MockStore, session: Session, accountNumber: string) {
  requirePermission(session, "application:create")
  const account = store.accounts.find((a) => a.accountNumber === accountNumber)
  if (!account) throw new ApiError(404, "account_not_found", "No current account with that number")
  return account
}

/** A new application must name a current account of the right kind, held by the same person or business. */
export function assertAccountMatches(store: MockStore, input: NewApplicationInput) {
  const account = store.accounts.find((a) => a.accountNumber === input.accountNumber)
  if (!account) throw new ApiError(422, "account_not_found", "No current account with that number")
  if (account.holder.kind !== input.applicant.kind) {
    throw new ApiError(
      422,
      "account_kind",
      "A Retail loan needs a personal account; an SME loan needs a business account",
    )
  }
  if (applicantBvn(account.holder) !== applicantBvn(input.applicant)) {
    throw new ApiError(422, "account_mismatch", "The applicant's BVN doesn't match the account holder's")
  }
}
