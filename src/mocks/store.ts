import { z } from "zod"
import { applicationSchema, customerAccountSchema } from "@/features/applications/schemas/application"
import { auditEventSchema } from "@/features/audit/schemas/audit"
import { userSchema } from "@/features/auth/schemas/user"
import { referenceDataSchema } from "@/features/admin/schemas/reference"
import { notificationSchema } from "@/features/notifications/schemas/notification"
import type { NotificationPrefs } from "@/features/settings/types"
import { delegationSchema, workflowDefinitionSchema } from "@/features/workflow/schemas/workflow"
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/rbac/permissions"

/**
 * In-browser mock database, loaded from the static JSON in ./data.
 * Lives for the lifetime of the tab — a reload restores the seed.
 */
const storeSchema = z.object({
  users: z.array(userSchema),
  reference: referenceDataSchema,
  workflows: z.array(workflowDefinitionSchema),
  delegations: z.array(delegationSchema),
  applications: z.array(applicationSchema),
  audit: z.array(auditEventSchema),
  notifications: z.array(notificationSchema),
  /** Current accounts at the bank: stands in for core banking. */
  accounts: z.array(customerAccountSchema),
})

export type MockStore = z.infer<typeof storeSchema> & {
  rolePermissions: typeof DEFAULT_ROLE_PERMISSIONS
  /** Wrong approval-PIN attempts per user, for lockout. */
  pinAttempts: Map<string, { failures: number; lockedUntil: number | null }>
  /** PINs users have changed from the demo default. A real backend stores only a hash. */
  pins: Map<string, string>
  /** Passwords users have changed from the demo default, and when. A real backend keeps only a salted hash. */
  passwords: Map<string, { value: string; changedAt: string }>
  /** Personal notification preferences; missing means the defaults. */
  notificationPrefs: Map<string, NotificationPrefs>
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

/** Moves every ISO timestamp forward so the data is as fresh as when it was generated. */
function shiftDates<T>(value: T, offsetMs: number): T {
  if (typeof value === "string") {
    return (ISO_DATETIME.test(value) ? new Date(Date.parse(value) + offsetMs).toISOString() : value) as T
  }
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, offsetMs)) as T
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftDates(v, offsetMs)])) as T
  }
  return value
}

async function load(): Promise<MockStore> {
  const [meta, users, reference, workflows, delegations, applications, audit, notifications, accounts] =
    await Promise.all([
      import("./data/meta.json"),
      import("./data/users.json"),
      import("./data/reference.json"),
      import("./data/workflows.json"),
      import("./data/delegations.json"),
      import("./data/applications.json"),
      import("./data/audit.json"),
      import("./data/notifications.json"),
      import("./data/accounts.json"),
    ])
  const offset = Date.now() - Date.parse(meta.default.anchor)
  const raw = {
    users: users.default,
    reference: reference.default,
    workflows: workflows.default,
    delegations: delegations.default,
    applications: applications.default,
    audit: audit.default,
    notifications: notifications.default,
    accounts: accounts.default,
  }
  // Workflow definitions keep their real edit dates.
  const data = storeSchema.parse({ ...shiftDates(raw, offset), workflows: raw.workflows })
  return {
    ...data,
    rolePermissions: structuredClone(DEFAULT_ROLE_PERMISSIONS),
    pinAttempts: new Map(),
    pins: new Map(),
    passwords: new Map(),
    notificationPrefs: new Map(),
  }
}

let storePromise: Promise<MockStore> | null = null

export function getStore(): Promise<MockStore> {
  storePromise ??= load()
  return storePromise
}
