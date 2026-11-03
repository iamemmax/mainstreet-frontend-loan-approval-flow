import type { z } from "zod"
import type { auditEntitySchema, auditEventSchema, auditListParamsSchema } from "../schemas/audit"

export type AuditEvent = z.infer<typeof auditEventSchema>
export type AuditEntity = z.infer<typeof auditEntitySchema>
export type AuditListParams = z.input<typeof auditListParamsSchema>
