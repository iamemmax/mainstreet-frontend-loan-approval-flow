import type { z } from "zod"
import type { agentSchema, branchSchema, productSchema, referenceDataSchema, regionSchema } from "../schemas/reference"

export type Region = z.infer<typeof regionSchema>
export type Branch = z.infer<typeof branchSchema>
export type Agent = z.infer<typeof agentSchema>
export type Product = z.infer<typeof productSchema>
export type ReferenceData = z.infer<typeof referenceDataSchema>
