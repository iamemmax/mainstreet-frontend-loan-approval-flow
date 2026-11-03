import type { Application } from "@/features/applications/types"
import type { Session } from "@/features/auth/types"
import { ROLE_PROFILE } from "@/lib/rbac/profiles"
import type { Role } from "@/lib/rbac/roles"
import type { MockStore } from "../store"

/** Anyone who has already worked on the file keeps seeing it, so their history stays reachable. */
function workedOn(app: Application, userId: string) {
  return (
    app.officerId === userId ||
    app.createdById === userId ||
    app.assessment?.updatedById === userId ||
    !!app.workflow?.decisions.some((d) => d.actorId === userId || d.onBehalfOfId === userId) ||
    !!app.workflow?.stageVotes.some((v) => v.userId === userId) ||
    app.messages.some((m) => m.authorId === userId) ||
    app.offers.some((o) => o.sentById === userId)
  )
}

/** Whether the user (or someone they are covering for) is needed at the application's current approval stage. */
function neededAtStage(
  store: MockStore,
  app: Application,
  user: { id: string; role: Role },
  coveringFor: { id: string; role: Role }[],
) {
  if (app.status !== "pending_approval" || !app.workflow?.currentStageKey) return false
  const stage = store.workflows
    .find((w) => w.id === app.workflow!.definitionId)
    ?.stages.find((s) => s.key === app.workflow!.currentStageKey)
  if (!stage) return false
  return [user, ...coveringFor].some((u) =>
    stage.committee ? stage.committee.memberIds.includes(u.id) : stage.approverRoles.includes(u.role),
  )
}

/**
 * Work-based access. Without "See all applications", staff see only what they
 * own, what they have worked on, and what is waiting on them right now, so
 * e.g. the final committee never sees a loan still at the Credit Manager.
 */
export function canSeeApplication(store: MockStore, session: Session, app: Application, now = new Date()) {
  if (session.permissions.includes("application:view_all")) return true
  const { id, role } = session.user
  if (workedOn(app, id)) return true
  // Before approval, the team that owns the step sees it. Approval stages come from the workflow instead.
  if (ROLE_PROFILE[role].owns.includes(app.status)) return true
  const coveringFor = store.delegations
    .filter((d) => d.toUserId === id && new Date(d.startsAt) <= now && now <= new Date(d.endsAt))
    .flatMap((d) => store.users.filter((u) => u.id === d.fromUserId))
  return neededAtStage(store, app, { id, role }, coveringFor)
}
