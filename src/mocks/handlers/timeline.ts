import type { Application, ApplicationStatus } from "@/features/applications/types"
import { currentOffer } from "@/features/applications/utils/offer"
import type { MockStore } from "../store"

export const DAY = 86_400_000

/** Audit actions that move an application into each status (seed data and live actions use different names). */
export const ENTRY_ACTIONS: Partial<Record<ApplicationStatus, string[]>> = {
  submitted: ["application.submitted", "application.submit_draft", "application.resubmit"],
  in_verification: ["application.start_verification"],
  in_assessment: ["verification.completed", "application.complete_verification"],
  returned: ["workflow.return", "application.returned"],
  more_info_requested: ["workflow.request_info"],
  approved: ["workflow.approve"],
  ready_for_disbursement: ["handover.ready", "application.mark_ready"],
}
export const VERIFIED_ACTIONS = ENTRY_ACTIONS.in_assessment!
export const HANDOVER_ACTIONS = ENTRY_ACTIONS.ready_for_disbursement!

export type AuditLookup = (appId: string, actions?: string[]) => string | undefined

/** Latest time of each audited action per application. */
export function auditIndex(store: MockStore): AuditLookup {
  const latest = new Map<string, string>()
  for (const e of store.audit) {
    if (e.entity !== "application") continue
    const key = `${e.entityId}|${e.action}`
    const seen = latest.get(key)
    if (!seen || e.at > seen) latest.set(key, e.at)
  }
  return (appId, actions = []) =>
    actions.reduce<string | undefined>((max, a) => {
      const at = latest.get(`${appId}|${a}`)
      return at && (!max || at > max) ? at : max
    }, undefined)
}

/** When the application reached its current status (or, in approval, its current level). */
export function enteredAt(app: Application, latest: AuditLookup): string {
  const offer = currentOffer(app)
  const audited = latest(app.id, ENTRY_ACTIONS[app.status])
  switch (app.status) {
    case "draft":
      return app.createdAt
    case "pending_approval":
      return app.workflow?.stageEnteredAt ?? audited ?? app.updatedAt
    case "offer_sent":
      return offer?.sentAt ?? app.updatedAt
    case "offer_accepted":
      return offer?.respondedAt ?? app.updatedAt
    case "submitted":
      return (
        [app.submittedAt, audited]
          .filter((d): d is string => !!d)
          .sort()
          .at(-1) ?? app.updatedAt
      )
    default:
      return audited ?? app.updatedAt
  }
}

/** The offer the customer accepted, if any. */
export function acceptedOffer(app: Application) {
  return app.offers.findLast((o) => o.status === "accepted" && o.respondedAt) ?? null
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
