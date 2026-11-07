import type { Session } from "@/features/auth/types"
import type { BvnRecord, NewApplicationInput } from "@/features/applications/types"
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
  if (account.status !== "active") {
    throw new ApiError(422, "account_dormant", "This account is dormant. The customer must reactivate it first")
  }
}

/**
 * Looks a person up on the BVN register, to fill in a guarantor or next of kin. The mock's register is
 * everyone it knows by BVN: personal account holders, then guarantors and next of kin on earlier applications.
 */
export function lookUpBvn(store: MockStore, session: Session, bvn: string): BvnRecord {
  requirePermission(session, "application:create")
  const record = holderRecord(store, bvn) ?? partyRecord(store, bvn)
  if (!record) throw new ApiError(404, "bvn_not_found", "No BVN record found")
  return record
}

/** A personal account holder with this BVN, as a register entry. */
function holderRecord(store: MockStore, bvn: string): BvnRecord | null {
  for (const { holder } of store.accounts) {
    if (holder.kind === "individual" && holder.bvn === bvn) {
      const { firstName, middleName, lastName, dateOfBirth, gender, phone, address } = holder
      return { bvn, firstName, middleName, lastName, dateOfBirth, gender, phone, address }
    }
  }
  return null
}

/** A guarantor or next of kin with this BVN on an earlier application, as a register entry. */
function partyRecord(store: MockStore, bvn: string): BvnRecord | null {
  for (const app of store.applications) {
    const parties = app.nextOfKin ? [...app.guarantors, app.nextOfKin] : app.guarantors
    const party = parties.find((p) => p.bvn === bvn && p.dateOfBirth && p.gender)
    if (party) {
      const [firstName, ...rest] = party.name.split(" ")
      return {
        bvn,
        firstName,
        middleName: null,
        lastName: rest.join(" "),
        dateOfBirth: party.dateOfBirth!,
        gender: party.gender!,
        phone: party.phone,
        address: party.address,
      }
    }
  }
  return null
}
