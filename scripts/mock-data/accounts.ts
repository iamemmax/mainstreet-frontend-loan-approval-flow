/**
 * Current accounts held at the bank, which staff look up on a new application.
 * They come from their own random stream so the rest of the seed stays byte-identical.
 */
import type { Applicant, Application, CustomerAccount } from "@/features/applications/types"
import { NAME_POOLS, PHONE_PREFIXES, SME_NAME_PARTS, SME_SECTORS, STREETS, type Ethnicity } from "./names"
import { createRandom, type Random } from "./random"

const PERSONAL_ACCOUNTS = 30
const CORPORATE_ACCOUNTS = 12
const ETHNICITIES = Object.keys(NAME_POOLS) as Ethnicity[]

/** The state for each town in STREETS, so an address and its state agree. */
const STATE_OF_TOWN: Record<string, string> = {
  "Victoria Island": "Lagos",
  Ikeja: "Lagos",
  Lekki: "Lagos",
  Yaba: "Lagos",
  "Wuse II": "FCT",
  Wuse: "FCT",
  "Port Harcourt": "Rivers",
  "Benin City": "Edo",
  Kano: "Kano",
  Ibadan: "Oyo",
  Enugu: "Enugu",
  Abeokuta: "Ogun",
}

/** Every current account in the seed, personal first. Account numbers are unique. */
export function seedAccounts(): CustomerAccount[] {
  const rnd = createRandom(20_261_101)
  const used = new Set<string>()
  const accounts: CustomerAccount[] = []
  for (let i = 0; i < PERSONAL_ACCOUNTS; i++) accounts.push(personalAccount(rnd, uniqueNumber(rnd, used)))
  for (let i = 0; i < CORPORATE_ACCOUNTS; i++) accounts.push(corporateAccount(rnd, uniqueNumber(rnd, used)))
  return accounts
}

/** Every seeded applicant banks here. Their account number comes from the application id. */
export function accountNumberFor(app: Application): string {
  return `12${app.id.replace(/\D/g, "").padStart(8, "0")}`
}

/** The current account a seeded applicant applied with, opened a few years before the application. */
export function applicantAccount(app: Application): CustomerAccount {
  const created = new Date(app.createdAt)
  const yearsBefore = 1 + (Number(app.id.replace(/\D/g, "")) % 8)
  return {
    accountNumber: accountNumberFor(app),
    accountName: accountNameOf(app.applicant),
    openedOn: `${created.getUTCFullYear() - yearsBefore}-${twoDigits(created.getUTCMonth() + 1)}-01`,
    holder: app.applicant,
  }
}

/** How core banking prints the name: surname first in capitals, or the business name. */
function accountNameOf(holder: Applicant): string {
  if (holder.kind === "business") return holder.businessName.toUpperCase()
  return [holder.lastName, holder.firstName, holder.middleName].filter(Boolean).join(" ").toUpperCase()
}

/** A 10-digit NUBAN not used yet. The bank's current accounts start with 11. */
function uniqueNumber(rnd: Random, used: Set<string>): string {
  let accountNumber = `11${rnd.digits(8)}`
  while (used.has(accountNumber)) accountNumber = `11${rnd.digits(8)}`
  used.add(accountNumber)
  return accountNumber
}

function personalAccount(rnd: Random, accountNumber: string): CustomerAccount {
  const pool = NAME_POOLS[rnd.pick(ETHNICITIES)]
  const gender = rnd.chance(0.5) ? "male" : "female"
  const firstName = rnd.pick(pool[gender])
  const lastName = rnd.pick(pool.last)
  const middleName = rnd.chance(0.4) ? rnd.pick(pool[gender]) : null
  const holder: Applicant = {
    kind: "individual",
    firstName,
    middleName,
    lastName,
    dateOfBirth: `${rnd.int(1966, 2001)}-${twoDigits(rnd.int(1, 12))}-${twoDigits(rnd.int(1, 28))}`,
    gender,
    bvn: `22${rnd.digits(9)}`,
    nin: rnd.digits(11),
    phone: phone(rnd),
    email: `${firstName}.${lastName}${rnd.int(1, 99)}@gmail.com`.toLowerCase(),
    ...address(rnd),
  }
  return { accountNumber, accountName: accountNameOf(holder), openedOn: openedOn(rnd), holder }
}

function corporateAccount(rnd: Random, accountNumber: string): CustomerAccount {
  const pool = NAME_POOLS[rnd.pick(ETHNICITIES)]
  const promoterName = `${rnd.pick(pool[rnd.chance(0.5) ? "male" : "female"])} ${rnd.pick(pool.last)}`
  const businessName = `${rnd.pick(SME_NAME_PARTS.prefix)} ${rnd.pick(SME_NAME_PARTS.noun)} ${rnd.pick(SME_NAME_PARTS.suffix)}`
  return {
    accountNumber,
    accountName: businessName.toUpperCase(),
    openedOn: openedOn(rnd),
    holder: {
      kind: "business",
      businessName,
      rcNumber: `RC${rnd.int(150_000, 1_950_000)}`,
      tin: `${rnd.digits(8)}-0001`,
      sector: rnd.pick(SME_SECTORS),
      yearsInOperation: rnd.int(1, 22),
      ...address(rnd),
      phone: phone(rnd),
      email: `info@${promoterName.split(" ")[1].toLowerCase()}${rnd.int(10, 99)}.com.ng`,
      promoter: { name: promoterName, bvn: `22${rnd.digits(9)}`, nin: rnd.digits(11) },
    },
  }
}

/** A street address and the state it's in. */
function address(rnd: Random): { address: string; state: string } {
  const street = rnd.pick(STREETS)
  const town = street.split(", ")[1]
  return { address: `${rnd.int(1, 120)} ${street}`, state: STATE_OF_TOWN[town] }
}

function openedOn(rnd: Random): string {
  return `${rnd.int(2012, 2025)}-${twoDigits(rnd.int(1, 12))}-${twoDigits(rnd.int(1, 28))}`
}

function phone(rnd: Random): string {
  return `+234${rnd.pick(PHONE_PREFIXES).slice(1)}${rnd.digits(7)}`
}

function twoDigits(n: number): string {
  return String(n).padStart(2, "0")
}
