import type { Application, NewApplicationInput } from "@/features/applications/types"
import type { Session } from "@/features/auth/types"
import { ApiError } from "@/lib/api/errors"
import type { MockStore } from "../store"
import { assertAccountMatches } from "./accounts"
import { assertWithinProduct, audit, flagDuplicate, intakeGaps, requireOnDesk, requirePermission } from "./actions"
import { getApplication } from "./applications"

/**
 * Saves changes to a draft, or submits it when `asDraft` is false. Only the officer who owns
 * the draft can, and submitting needs the same complete intake as a new application.
 */
export function updateDraft(store: MockStore, session: Session, id: string, input: NewApplicationInput) {
  requirePermission(session, "application:edit")
  const app = getApplication(store, session, id)
  if (app.status !== "draft") throw new ApiError(409, "not_draft", "This application has already been submitted")
  const now = new Date()
  requireOnDesk(store, session, app, now)
  assertAccountMatches(store, input)
  assertWithinProduct(store, input)

  const { asDraft, documents, ...details } = input
  Object.assign(app, details)
  app.documents = keptDocuments(app, documents, session.user.id, now)
  app.updatedAt = now.toISOString()
  flagDuplicate(store, app)

  if (asDraft) {
    audit(store, session, app, "application.draft_saved", "Draft updated")
    return app
  }
  const missing = intakeGaps(app)
  if (missing.length) throw new ApiError(422, "incomplete", `Complete the application first: ${missing.join(", ")}`)
  app.status = "submitted"
  app.submittedAt = now.toISOString()
  audit(store, session, app, "application.submit_draft", "Draft submitted for verification")
  return app
}

/** Documents already on file stay as they are; new ones get an id. The mock keeps no file bytes. */
function keptDocuments(
  app: Application,
  documents: NewApplicationInput["documents"],
  uploadedById: string,
  now: Date,
): Application["documents"] {
  return documents.map((doc, i) => {
    const existing = app.documents.find((d) => d.type === doc.type && d.fileName === doc.fileName)
    if (existing) return { ...existing, description: doc.description, owner: doc.owner }
    return {
      ...doc,
      id: `${app.id}-doc-${now.getTime()}-${i + 1}`,
      uploadedAt: now.toISOString(),
      uploadedById,
      url: null,
    }
  })
}
