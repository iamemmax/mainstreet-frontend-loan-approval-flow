import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns"

type DateInput = string | Date

function toDate(value: DateInput): Date {
  return typeof value === "string" ? parseISO(value) : value
}

export function formatDate(value: DateInput, pattern = "d MMM yyyy"): string {
  const d = toDate(value)
  return isValid(d) ? format(d, pattern) : "—"
}

export function formatDateTime(value: DateInput): string {
  return formatDate(value, "d MMM yyyy, HH:mm")
}

export function formatRelative(value: DateInput): string {
  const d = toDate(value)
  if (!isValid(d)) return "—"
  return Math.abs(Date.now() - d.getTime()) < 60_000 ? "just now" : formatDistanceToNowStrict(d, { addSuffix: true })
}

/** Compact duration such as "2d 4h", "3h 12m" or "45m". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  const minutes = Math.floor(abs / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}
