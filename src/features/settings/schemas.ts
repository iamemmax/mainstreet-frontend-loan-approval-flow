import { z } from "zod"
import { notificationKindSchema } from "@/features/notifications/schemas/notification"

export const NOTIFICATION_CHANNELS = ["inApp", "email", "sms"] as const
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS)

/** Per event, the channels this person wants. */
export const notificationPrefsSchema = z.partialRecord(notificationKindSchema, z.array(notificationChannelSchema))

const pin = z.string().regex(/^\d{4}$/, "Enter 4 digits")

/** Repeated digits (1111) or a straight run (1234, 9876) are too easy to guess. */
export function isWeakPin(value: string) {
  if (/^(\d)\1{3}$/.test(value)) return true
  const steps = [...value].slice(1).map((d, i) => Number(d) - Number(value[i]))
  return steps.every((s) => s === 1) || steps.every((s) => s === -1)
}

export const changePinInputSchema = z
  .object({ currentPin: pin, newPin: pin, confirmPin: pin })
  .refine((v) => v.newPin === v.confirmPin, { path: ["confirmPin"], message: "The two new PINs don't match" })
  .refine((v) => v.newPin !== v.currentPin, {
    path: ["newPin"],
    message: "Choose a PIN different from your current one",
  })
  .refine((v) => !isWeakPin(v.newPin), {
    path: ["newPin"],
    message: "Avoid repeated digits or a straight run like 1234",
  })

/** Each password rule, in the order the checklist shows them. */
export const PASSWORD_RULES: { id: string; label: string; test: (password: string) => boolean }[] = [
  { id: "length", label: "At least 10 characters", test: (p) => p.length >= 10 },
  { id: "case", label: "Upper and lower case letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "number", label: "At least one number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "At least one symbol, e.g. ! @ # ?", test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().max(128),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    for (const rule of PASSWORD_RULES)
      if (!rule.test(v.newPassword)) ctx.addIssue({ code: "custom", path: ["newPassword"], message: rule.label })
    if (v.newPassword === v.currentPassword)
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Choose a password different from your current one",
      })
    if (v.newPassword !== v.confirmPassword)
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "The two new passwords don't match" })
  })

export const newDelegationInputSchema = z
  .object({
    toUserId: z.string().min(1, "Choose who will cover for you"),
    startsAt: z.string().min(1, "Choose a start date"),
    endsAt: z.string().min(1, "Choose an end date"),
    reason: z.string().trim().min(5, "Add a short reason, e.g. annual leave").max(200),
  })
  .refine((v) => v.endsAt >= v.startsAt, {
    path: ["endsAt"],
    message: "The end date must be on or after the start date",
  })
