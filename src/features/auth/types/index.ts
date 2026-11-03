import type { z } from "zod"
import type { loginInputSchema, sessionSchema, userSchema, userStatusSchema } from "../schemas/user"

export type User = z.infer<typeof userSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
export type Session = z.infer<typeof sessionSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
