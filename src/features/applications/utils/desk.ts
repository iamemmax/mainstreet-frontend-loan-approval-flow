import { ROLE_PROFILE } from "@/lib/rbac/profiles"
import type { Role } from "@/lib/rbac/roles"
import type { ApplicationStatus } from "../schemas/status"
import type { Application } from "../types"

/** Steps where the application sits with the relationship officer who owns it. */
const WITH_OFFICER: readonly ApplicationStatus[] = [
  "draft",
  "returned",
  "more_info_requested",
  "approved",
  "offer_sent",
]

/**
 * Whether the application is on this person's desk right now. Only they may change it:
 * - the owning relationship officer while it's with them (draft, returned, approved, offer out);
 * - the team that owns the step (verification, assessment, finance);
 * - in approval, whoever the workflow engine lets decide at the current stage (`canDecide`).
 * A rejected application is on nobody's desk.
 */
export function isOnDesk(app: Application, user: { id: string; role: Role }, canDecide: boolean): boolean {
  if (app.status === "pending_approval") return canDecide
  if (WITH_OFFICER.includes(app.status)) return app.officerId === user.id
  return ROLE_PROFILE[user.role].owns.includes(app.status)
}
