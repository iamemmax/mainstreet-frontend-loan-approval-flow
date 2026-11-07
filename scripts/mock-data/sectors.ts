import { BUSINESS_SECTORS } from "@/features/applications/schemas/business"
import type { Random } from "./random"

/** A sector and something the business does within it, so the two always agree. */
export function sectorAndActivity(rnd: Random): { sector: string; activity: string } {
  const sector = rnd.pick(BUSINESS_SECTORS)
  return { sector: sector.name, activity: rnd.pick(sector.activities) }
}
