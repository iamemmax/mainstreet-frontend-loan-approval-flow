"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { auditKeys, fetchAuditEvents } from "../api/audit"
import type { AuditListParams } from "../types"

export function useAuditEvents(params: AuditListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => fetchAuditEvents(params),
    placeholderData: keepPreviousData,
  })
}
