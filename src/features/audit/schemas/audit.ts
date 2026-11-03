import { z } from "zod"
import { isoDate, paginatedSchema } from "@/lib/api/schemas"

export const auditEntitySchema = z.enum(["application", "workflow", "user", "product", "template", "offer", "session"])

export const auditEventSchema = z.object({
  id: z.string(),
  at: isoDate,
  actorId: z.string().nullable(),
  actorName: z.string(),
  action: z.string(),
  entity: auditEntitySchema,
  entityId: z.string(),
  entityLabel: z.string(),
  summary: z.string(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
})

export const auditListSchema = paginatedSchema(auditEventSchema)

export const auditListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(50),
  entity: z.array(auditEntitySchema).optional(),
  entityId: z.string().optional(),
  actorId: z.array(z.string()).optional(),
  action: z.array(z.string()).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})
