import { mockRequest, paginate } from "@/mocks/transport"
import { auditListParamsSchema, auditListSchema } from "../schemas/audit"
import type { AuditListParams } from "../types"

export const auditKeys = {
  all: ["audit"] as const,
  list: (params: AuditListParams) => [...auditKeys.all, params] as const,
}

export function fetchAuditEvents(params: AuditListParams) {
  const p = auditListParamsSchema.parse(params)
  return mockRequest(
    auditListSchema,
    ({ store }) => {
      const rows = store.audit.filter(
        (e) =>
          (!p.entity?.length || p.entity.includes(e.entity)) &&
          (!p.entityId || e.entityId === p.entityId) &&
          (!p.actorId?.length || (e.actorId !== null && p.actorId.includes(e.actorId))) &&
          (!p.action?.length || p.action.includes(e.action)) &&
          (!p.from || e.at >= p.from) &&
          (!p.to || e.at <= p.to),
      )
      return paginate(rows, p.page, p.pageSize)
    },
    { permission: "application:view" },
  )
}
