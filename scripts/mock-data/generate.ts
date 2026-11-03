/**
 * Regenerates the static mock JSON in src/mocks/data.
 *   pnpm mock:generate
 * Output is deterministic. Timestamps are relative to ANCHOR; the app shifts
 * them to "now" at load time so SLA states stay live.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { accountNumberFor, applicantAccount, seedAccounts } from "./accounts"
import { seedApplications } from "./applications"
import { enrichApplication } from "./enrich"
import { AGENTS, BANK_LIST, BRANCHES, PRODUCTS, REGIONS } from "./reference"
import { USERS } from "./users"
import { RETAIL_WORKFLOW, SME_WORKFLOW } from "./workflows"

const ANCHOR = "2026-10-27T09:00:00.000Z"
const out = join(__dirname, "../../src/mocks/data")
mkdirSync(out, { recursive: true })

const seed = seedApplications(new Date(ANCHOR))
const applications = seed.applications
  .map(enrichApplication)
  .map((app) => ({ ...app, accountNumber: accountNumberFor(app) }))
const files: Record<string, unknown> = {
  "meta.json": { anchor: ANCHOR, generatedFrom: "scripts/mock-data/generate.ts" },
  "users.json": USERS,
  "reference.json": { regions: REGIONS, branches: BRANCHES, agents: AGENTS, products: PRODUCTS, banks: BANK_LIST },
  "workflows.json": [RETAIL_WORKFLOW, SME_WORKFLOW],
  "delegations.json": seed.delegations,
  "applications.json": applications,
  "audit.json": seed.audit,
  "notifications.json": seed.notifications,
  "accounts.json": [...seedAccounts(), ...applications.map(applicantAccount)],
}

for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(out, name), JSON.stringify(data, null, 2) + "\n")
  console.log(`wrote ${name}`)
}
