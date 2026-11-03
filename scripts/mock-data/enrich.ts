/**
 * Adds intake, KYC and assessment detail to generated applications. Uses its
 * own random stream per application so the core seed stays byte-identical.
 */
import type { Application, VerificationResult } from "@/features/applications/types"
import { REQUIRED_DOCUMENTS } from "@/features/applications/schemas/application"
import { NAME_POOLS, PHONE_PREFIXES, STREETS } from "./names"
import { computeOffer } from "@/features/applications/utils/offer"
import { scoreApplication } from "@/features/applications/utils/scorecard"
import { buildCreditHistory, bureauFindings } from "../../src/mocks/credit-history"
import { createRandom, type Random } from "./random"
import { PRODUCTS } from "./reference"
import { USERS } from "./users"

const HOUR = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString()

const RELATIONSHIPS = ["Spouse", "Brother", "Sister", "Father", "Mother", "Cousin", "Colleague", "Friend"] as const
const OCCUPATIONS = [
  "Civil servant",
  "Trader",
  "Teacher",
  "Nurse",
  "Engineer",
  "Accountant",
  "Business owner",
  "Pharmacist",
] as const
const COLLATERAL = [
  { type: "Vehicle", description: "Toyota Hilux 2019, registered to the business" },
  { type: "Equipment", description: "Industrial generator and cold-room equipment" },
  { type: "Inventory", description: "Warehouse stock under tripartite agreement" },
  { type: "Property", description: "Certificate of Occupancy, 2-bedroom flat" },
  { type: "Fixed deposit", description: "Lien on fixed deposit held with the Bank" },
] as const

const FILE_NAMES: Record<string, string> = {
  id_card: "national-id.jpg",
  bank_statement: "bank-statement-6-months.pdf",
  payslip: "payslip-last-3-months.pdf",
  utility_bill: "utility-bill.pdf",
  cac_certificate: "cac-certificate-and-status-report.pdf",
  management_accounts: "management-accounts-fy2025.pdf",
  guarantor_form: "signed-guarantor-form.pdf",
}

/** Files in public/samples (see sample-files.py) that stand in for the customer's uploads. */
const SAMPLE_FILES: Record<string, string> = {
  id_card: "national-id.svg",
  bank_statement: "bank-statement-6-months.pdf",
  payslip: "payslip-last-3-months.pdf",
  utility_bill: "utility-bill.pdf",
  cac_certificate: "cac-certificate-and-status-report.pdf",
  management_accounts: "management-accounts-fy2025.pdf",
  guarantor_form: "signed-guarantor-form.pdf",
}

const analysts = USERS.filter((u) => u.role === "credit_analyst")

function person(rnd: Random) {
  const pool = NAME_POOLS[rnd.pick(Object.keys(NAME_POOLS) as (keyof typeof NAME_POOLS)[])]
  const first = rnd.chance(0.5) ? rnd.pick(pool.male) : rnd.pick(pool.female)
  return `${first} ${rnd.pick(pool.last)}`
}

const phone = (rnd: Random) => `+234${rnd.pick(PHONE_PREFIXES).slice(1)}${rnd.digits(7)}`
const address = (rnd: Random, state: string) => `${rnd.int(2, 140)} ${rnd.pick(STREETS)}, ${state}`

const VERIFIED_STATUSES = new Set([
  "in_assessment",
  "pending_approval",
  "returned",
  "more_info_requested",
  "approved",
  "offer_sent",
  "offer_accepted",
  "ready_for_disbursement",
])
const ASSESSED_STATUSES = new Set([...VERIFIED_STATUSES].filter((s) => s !== "in_assessment"))

function verification(app: Application, rnd: Random): VerificationResult[] {
  if (!app.submittedAt || app.status === "submitted" || app.status === "draft") return []
  const started = new Date(app.submittedAt).getTime() + HOUR
  const full = VERIFIED_STATUSES.has(app.status) || (app.status === "rejected" && app.workflow !== null)
  const kinds: VerificationResult["kind"][] = ["bvn", "nin", "phone"]
  if (full || rnd.chance(0.5)) kinds.push(app.segment === "sme" ? "cac" : "employer", "bank_statement")
  if (full) kinds.push("bureau_crc", "bureau_firstcentral", "bureau_creditregistry", "pep_sanctions", "blacklist")

  const risky = app.riskRating === "high" || app.riskRating === "medium"
  return kinds.map((kind, i): VerificationResult => {
    const at = iso(started + i * 4 * 60_000)
    switch (kind) {
      case "bvn":
        return app.flags.includes("bvn_failed")
          ? {
              kind,
              status: "failed",
              detail: "Name and date of birth do not match the BVN record",
              provider: "Prembly",
              at,
            }
          : {
              kind,
              status: "passed",
              detail: "Name, date of birth and photo match the BVN record",
              provider: "Prembly",
              at,
            }
      case "nin":
        return { kind, status: "passed", detail: "NIN is valid and matches the applicant", provider: "Prembly", at }
      case "phone":
        return {
          kind,
          status: "passed",
          detail: "Phone number is registered to the applicant",
          provider: "Prembly",
          at,
        }
      case "cac":
        return {
          kind,
          status: "passed",
          detail: "Company is active on the CAC register; directors match",
          provider: "Prembly",
          at,
        }
      case "employer":
        return {
          kind,
          status: "passed",
          detail: "Employment and salary confirmed with HR",
          provider: "Employer confirmation",
          at,
        }
      case "bank_statement":
        return risky && rnd.chance(0.4)
          ? {
              kind,
              status: "review",
              detail: "Irregular inflows in 2 of the last 6 months",
              provider: "Statement analysis",
              at,
            }
          : {
              kind,
              status: "passed",
              detail: "Regular inflows consistent with declared income",
              provider: "Statement analysis",
              at,
            }
      case "bureau_crc":
      case "bureau_firstcentral":
      case "bureau_creditregistry": {
        const provider = {
          bureau_crc: "CRC Credit Bureau",
          bureau_firstcentral: "FirstCentral",
          bureau_creditregistry: "CreditRegistry",
        }[kind]
        return app.riskRating === "high" && rnd.chance(0.6)
          ? { kind, status: "review", detail: "1 facility more than 30 days past due", provider, at }
          : { kind, status: "passed", detail: `${rnd.int(0, 3)} active facilities, none delinquent`, provider, at }
      }
      case "pep_sanctions":
        return app.flags.includes("pep_hit")
          ? {
              kind,
              status: "review",
              detail: "Possible match on the PEP list — enhanced due diligence required",
              provider: "Screening",
              at,
            }
          : { kind, status: "passed", detail: "No PEP, sanctions or adverse media matches", provider: "Screening", at }
      case "blacklist":
        return { kind, status: "passed", detail: "Not on the Bank's internal blacklist", provider: "Internal", at }
    }
  })
}

/**
 * The shortest tenor the product allows that keeps the repayment within
 * `share` of income — so the sample book is mostly affordable, as a real one is.
 */
function affordableTenor(app: Application, income: number, share: number): number {
  const product = PRODUCTS.find((p) => p.id === app.productId)!
  for (let t = Math.max(app.tenorMonths, product.minTenorMonths); t <= product.maxTenorMonths; t++) {
    if (computeOffer(product, app.amountRequested, t).monthlyRepayment <= income * share) return t
  }
  return product.maxTenorMonths
}

function enrichCore(seed: Application, index: number): Application {
  const rnd = createRandom(50_000 + index)
  const seedIncome =
    seed.employment?.monthlyNetIncome ??
    (seed.business ? seed.business.monthlyRevenue - seed.business.monthlyExpenses : 0)
  // About one in eight applications stays stretched, so the scorecard has real declines to show.
  // Shares are of gross income; expenses take 25–45% of it, so 18% lands near 30% of disposable income.
  const share = rnd.chance(0.12) ? 0.45 : 0.18
  const product = PRODUCTS.find((p) => p.id === seed.productId)!
  const tenorMonths = affordableTenor(seed, seedIncome, share)
  // If even the longest tenor can't fit the loan, the sample applicant earns more — amounts were drawn without regard to income.
  const needed = computeOffer(product, seed.amountRequested, tenorMonths).monthlyRepayment / share
  const fittedIncome =
    seedIncome >= needed ? seedIncome : Math.ceil((needed * (1 + rnd.int(0, 20) / 100)) / 1_000_000) * 1_000_000
  const scale = seedIncome > 0 ? fittedIncome / seedIncome : 1
  const app: Application = {
    ...seed,
    tenorMonths,
    employment: seed.employment && { ...seed.employment, monthlyNetIncome: fittedIncome },
    business: seed.business && {
      ...seed.business,
      monthlyRevenue: Math.round(seed.business.monthlyRevenue * scale),
      monthlyExpenses: Math.round(seed.business.monthlyExpenses * scale),
      annualTurnover: Math.round(seed.business.annualTurnover * scale),
    },
  }
  const state = app.applicant.state
  const created = new Date(app.createdAt).getTime()
  const isDraft = app.status === "draft"

  const required = REQUIRED_DOCUMENTS[app.segment]
  const docTypes = isDraft ? required.filter(() => rnd.chance(0.5)) : required
  const documents = docTypes.map((type, i) => ({
    id: `${app.id}-doc-${i + 1}`,
    type,
    fileName: FILE_NAMES[type] ?? `${type}.pdf`,
    url: SAMPLE_FILES[type] ? `/samples/${SAMPLE_FILES[type]}` : null,
    sizeBytes: rnd.int(120, 4_800) * 1024,
    uploadedAt: iso(created + (i + 1) * 6 * 60_000),
    uploadedById: app.createdById,
  }))

  const guarantorCount = isDraft && rnd.chance(0.5) ? 0 : app.segment === "sme" ? 2 : 1
  const guarantors = Array.from({ length: guarantorCount }, () => ({
    name: person(rnd),
    relationship: rnd.pick(RELATIONSHIPS),
    phone: phone(rnd),
    address: address(rnd, state),
    occupation: rnd.pick(OCCUPATIONS),
    monthlyIncome: rnd.int(15, 120) * 10_000 * 100,
    bvn: rnd.chance(0.8) ? `22${rnd.digits(9)}` : null,
  }))

  const nextOfKin =
    isDraft && rnd.chance(0.4)
      ? null
      : { name: person(rnd), relationship: rnd.pick(RELATIONSHIPS), phone: phone(rnd), address: address(rnd, state) }

  const collateral =
    app.segment === "sme" && !isDraft
      ? Array.from({ length: rnd.int(1, 2) }, () => {
          const c = rnd.pick(COLLATERAL)
          const value = Math.round((app.amountRequested * rnd.int(110, 180)) / 100 / 100_000) * 100_000
          return { ...c, estimatedValue: value, forcedSaleValue: Math.round((value * 0.7) / 100_000) * 100_000 }
        })
      : []

  const income =
    app.employment?.monthlyNetIncome ?? (app.business ? app.business.monthlyRevenue - app.business.monthlyExpenses : 0)
  const assessment =
    ASSESSED_STATUSES.has(app.status) || (app.status === "rejected" && app.workflow)
      ? {
          monthlyExpenses: Math.round((income * rnd.int(25, 45)) / 100 / 100) * 100,
          existingLoanRepayments: rnd.chance(0.4) ? Math.round((income * rnd.int(5, 20)) / 100 / 100) * 100 : 0,
          recommendation:
            app.riskRating === "low"
              ? ("approve" as const)
              : app.riskRating === "high"
                ? ("refer" as const)
                : rnd.chance(0.6)
                  ? ("approve" as const)
                  : ("refer" as const),
          notes:
            app.riskRating === "high"
              ? "Bureau shows a past-due facility. Recommend approval only with an additional guarantor or reduced amount."
              : app.riskRating === "medium"
                ? "Affordability is within policy. Statement shows some irregular inflows; conditions recommended."
                : "Stable income, clean bureau report and comfortable affordability. Recommend approval.",
          updatedAt: iso(new Date(app.submittedAt ?? app.createdAt).getTime() + 3 * HOUR),
          updatedById: rnd.pick(analysts).id,
        }
      : null

  const enriched: Application = {
    ...app,
    guarantors,
    nextOfKin,
    documents,
    collateral,
    verification: verification(app, rnd),
    assessment,
  }
  if (!assessment) return enriched
  // Score and rating come from the same scorecard the app uses, so every screen agrees.
  const result = scoreApplication(
    enriched,
    PRODUCTS.find((p) => p.id === app.productId)!,
  )
  const NOTES = {
    low: "Stable income, clean bureau report and comfortable affordability. Recommend approval.",
    medium: "Affordability is within policy but there are minor concerns; approval with conditions recommended.",
    high: "Affordability or bureau results are weak. Recommend approval only with a reduced amount or an additional guarantor.",
  } as const
  return {
    ...enriched,
    score: result.score,
    riskRating: result.riskRating,
    assessment: {
      ...assessment,
      recommendation:
        result.riskRating === "low"
          ? "approve"
          : result.recommendation === "decline" && rnd.chance(0.5)
            ? "decline"
            : "refer",
      notes: NOTES[result.riskRating],
    },
  }
}

const byRole = (role: string) => USERS.filter((u) => u.role === role && u.status !== "inactive")

/** Short staff exchanges: [author role or "officer", text]. */
const THREADS: [string, string][][] = [
  [
    ["credit_analyst", "Is the salary paid into the same account as the statement provided?"],
    ["officer", "Yes, the salary lands in the GTBank account on the statement. HR letter is under Documents."],
  ],
  [
    ["verification_officer", "BVN and NIN both match. Still waiting on the employer to confirm by email."],
    ["officer", "I've called HR — they'll send the confirmation today."],
    ["verification_officer", "Received, thanks. Completing verification now."],
  ],
  [
    ["credit_manager", "Please make sure the guarantor form is signed and witnessed before this goes further."],
    ["officer", "Signed copy uploaded this morning."],
  ],
  [
    [
      "officer",
      "Customer asked whether a 12-month tenor is possible to lower the repayment. Flagging for the analyst.",
    ],
  ],
  [
    ["credit_analyst", "Bureau shows a closed facility with late payments in 2024. Can we get an explanation letter?"],
    ["officer", "Customer says it was a salary delay during a job change. Letter requested."],
  ],
]

const REJECTION_NOTES = {
  kyc_failed:
    "BVN name and date of birth don't match the ID card. Customer could not explain the difference; closing the application.",
  adverse_bureau: "Two active delinquent facilities on CRC and FirstCentral. Outside policy for this product.",
} as const

/** Staff messages and pre-approval rejections, from their own random stream so the rest of the seed is unchanged. */
function withMessages(app: Application, index: number): Application {
  const rnd = createRandom(90_000 + index)
  if (!app.submittedAt) return app
  const start = new Date(app.submittedAt).getTime()
  const end = Math.max(start + 2 * HOUR, new Date(app.updatedAt).getTime())
  const messages: Application["messages"] = []

  if (app.status !== "submitted" && rnd.chance(0.45)) {
    const thread = rnd.pick(THREADS)
    const step = (end - start) / (thread.length + 1)
    thread.forEach(([role, body], i) => {
      const authorId = role === "officer" ? app.officerId : rnd.pick(byRole(role)).id
      messages.push({
        id: `${app.id}-msg-${i + 1}`,
        authorId,
        body,
        at: iso(start + Math.round(step * (i + 1))),
        kind: "message",
        reasonCode: null,
      })
    })
  }
  if (app.status === "rejected" && !app.workflow) {
    const reasonCode = app.flags.includes("bvn_failed") ? "kyc_failed" : "adverse_bureau"
    messages.splice(0, messages.length)
    messages.push({
      id: `${app.id}-msg-1`,
      authorId: rnd.pick(byRole("verification_officer")).id,
      body: REJECTION_NOTES[reasonCode],
      at: app.updatedAt,
      kind: "rejection",
      reasonCode,
    })
  }
  return messages.length ? { ...app, messages } : app
}

const PORTRAITS = 6

/**
 * Selfie and BVN photo for the face check. The score follows the BVN check: a failed
 * BVN means a different face on the record; a passed one, a strong match.
 */
function withIdentity(app: Application, index: number): Application {
  if (!app.submittedAt) return app
  const rnd = createRandom(70_000 + index)
  const person = (index % PORTRAITS) + 1
  const bvn = app.verification.find((v) => v.kind === "bvn")
  const mismatch = bvn?.status === "failed" || app.flags.includes("bvn_failed")
  const bvnPerson = mismatch ? (person % PORTRAITS) + 1 : person
  return {
    ...app,
    identity: {
      selfieUrl: `/samples/faces/person-${person}-selfie.svg`,
      bvnPhotoUrl: `/samples/faces/person-${bvnPerson}-bvn.svg`,
      selfieCapturedAt: app.submittedAt,
      faceMatch: !bvn && !mismatch ? null : mismatch ? rnd.int(18, 42) : rnd.int(86, 98),
    },
  }
}

const OFFER_STAGES = new Set(["approved", "offer_sent", "offer_accepted", "ready_for_disbursement"])

/**
 * About one in six approved loans is offered less than was asked, as approvers often
 * do. Offers carry whatever terms were current when they went out.
 */
function withOfferTerms(app: Application, index: number): Application {
  if (!OFFER_STAGES.has(app.status)) return app
  const rnd = createRandom(80_000 + index)
  const product = PRODUCTS.find((p) => p.id === app.productId)!
  const cut = rnd.chance(0.16) ? rnd.pick([0.6, 0.75, 0.8]) : null
  const amount = cut
    ? Math.max(product.minAmount, Math.round((app.amountRequested * cut) / 5_000_000) * 5_000_000)
    : app.amountRequested
  const adjusted = cut !== null && amount < app.amountRequested
  const approver = app.workflow?.decisions.findLast((d) => d.action === "approve")
  const offerTerms = adjusted
    ? {
        amount,
        tenorMonths: app.tenorMonths,
        reason: rnd.pick([
          "Reduced to keep repayments comfortably within affordability.",
          "Committee approved a lower amount given the bureau history.",
          "Lower amount pending a longer repayment track record with the bank.",
        ]),
        setById: approver?.actorId ?? app.officerId,
        setAt: approver?.at ?? app.updatedAt,
      }
    : null
  return { ...app, offerTerms, offers: app.offers.map((o) => ({ ...o, amount, tenorMonths: app.tenorMonths })) }
}

/** The bureau report, for every application whose bureau checks have run. */
function withCreditHistory(app: Application, index: number): Application {
  const pulled = app.verification.find((v) => v.kind.startsWith("bureau_"))
  if (!pulled) return app
  const creditHistory = buildCreditHistory(app, createRandom(60_000 + index), new Date(pulled.at))
  return { ...app, creditHistory, verification: bureauFindings(creditHistory, app.verification) }
}

export function enrichApplication(seed: Application, index: number): Application {
  return withCreditHistory(
    withOfferTerms(withIdentity(withMessages(enrichCore(seed, index), index), index), index),
    index,
  )
}
