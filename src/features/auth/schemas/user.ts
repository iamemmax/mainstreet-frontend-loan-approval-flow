import { z } from "zod"
import { roleSchema } from "@/lib/rbac/roles"
import { PERMISSIONS } from "@/lib/rbac/permissions"

export const userStatusSchema = z.enum(["active", "away", "inactive"])

export const userSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  branchId: z.string(),
  status: userStatusSchema,
})

export const permissionSchema = z.enum(PERMISSIONS)

export const sessionSchema = z.object({
  user: userSchema,
  permissions: z.array(permissionSchema),
})

export const loginInputSchema = z.object({ userId: z.string().min(1) })
