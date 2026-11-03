import type { z } from "zod"
import type {
  changePasswordInputSchema,
  changePinInputSchema,
  newDelegationInputSchema,
  notificationChannelSchema,
  notificationPrefsSchema,
} from "./schemas"

export type NotificationChannel = z.infer<typeof notificationChannelSchema>
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>
export type ChangePinInput = z.infer<typeof changePinInputSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>
export type NewDelegationInput = z.infer<typeof newDelegationInputSchema>
