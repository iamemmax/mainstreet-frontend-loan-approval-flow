import type { Segment } from "@/features/workflow/types"

const SEGMENT_CODE: Record<Segment, string> = { retail: "RTL", sme: "SME" }

/** Unique, human-readable application reference, e.g. ML-RTL-2610-01042. */
export function buildReference(segment: Segment, createdAt: Date, sequence: number): string {
  const yy = String(createdAt.getUTCFullYear()).slice(-2)
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0")
  return `ML-${SEGMENT_CODE[segment]}-${yy}${mm}-${String(sequence).padStart(5, "0")}`
}
