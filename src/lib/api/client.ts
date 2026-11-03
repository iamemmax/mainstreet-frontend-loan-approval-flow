import type { z } from "zod"
import { apiErrorBodySchema } from "./schemas"
import { ApiError } from "./errors"

/**
 * Typed fetch client for the real backend. Not used while the app runs on
 * mock data — feature `api/` modules call `mockRequest` instead. Swapping a
 * feature over means replacing its `mockRequest(...)` calls with `apiFetch(...)`.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"

type QueryValue = string | number | boolean | readonly (string | number)[] | null | undefined

export interface ApiFetchOptions<S extends z.ZodType> {
  schema: S
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

export function toQueryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      if (value.length) sp.set(key, value.join(","))
    } else {
      sp.set(key, String(value))
    }
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

export async function apiFetch<S extends z.ZodType>(path: string, opts: ApiFetchOptions<S>): Promise<z.output<S>> {
  const res = await fetch(`${BASE_URL}${path}${toQueryString(opts.query)}`, {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    signal: opts.signal,
  })
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const parsed = apiErrorBodySchema.safeParse(data)
    throw parsed.success
      ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.details)
      : new ApiError(res.status, "http_error", res.statusText || "Request failed")
  }
  return opts.schema.parse(data)
}
