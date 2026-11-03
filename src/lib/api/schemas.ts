import { z } from "zod"

export const isoDate = z.iso.datetime({ offset: true })
export const koboSchema = z.number().int().nonnegative()

export const sortDirSchema = z.enum(["asc", "desc"])

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
