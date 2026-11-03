import { z } from "zod"
import { koboSchema } from "@/lib/api/schemas"
import { segmentSchema } from "@/features/workflow/schemas/workflow"

export const regionSchema = z.object({ id: z.string(), name: z.string() })

export const branchSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  regionId: z.string(),
  state: z.string(),
})

export const agentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  branchId: z.string(),
})

export const productFeeSchema = z.object({
  code: z.string(),
  label: z.string(),
  /** Basis points of the principal, e.g. 100 = 1%. */
  rateBps: z.number().int().nonnegative(),
})

export const productSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  segment: segmentSchema,
  /** Monthly flat rate in basis points (e.g. 450 = 4.5% per month). */
  monthlyRateBps: z.number().int().positive(),
  fees: z.array(productFeeSchema),
  minAmount: koboSchema,
  maxAmount: koboSchema,
  minTenorMonths: z.number().int().positive(),
  maxTenorMonths: z.number().int().positive(),
  active: z.boolean(),
})

export const referenceDataSchema = z.object({
  regions: z.array(regionSchema),
  branches: z.array(branchSchema),
  agents: z.array(agentSchema),
  products: z.array(productSchema),
  /** Bank names for the salary and primary bank dropdowns. */
  banks: z.array(z.string()),
})
