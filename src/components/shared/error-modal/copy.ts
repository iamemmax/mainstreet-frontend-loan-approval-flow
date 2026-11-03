import { isApiError } from "@/lib/api/errors"

export type ErrorTone = "danger" | "warning"

export interface ErrorCopy {
  tone: ErrorTone
  icon: "x" | "lock" | "clock"
  title: string
  description: string
  steps: string[]
}

const BY_CODE: Record<string, Omit<ErrorCopy, "description">> = {
  forbidden: {
    tone: "danger",
    icon: "x",
    title: "Not allowed",
    steps: [
      "Check you're signed in as the right staff member.",
      "Ask a system administrator to grant your role access.",
    ],
  },
  pin_locked: {
    tone: "warning",
    icon: "lock",
    title: "PIN locked",
    steps: [
      "Wait 15 minutes, then try again.",
      "If you've forgotten your PIN, ask a system administrator to reset it.",
    ],
  },
  checks_outstanding: {
    tone: "warning",
    icon: "clock",
    title: "Not ready yet",
    steps: ["Open the Verification tab and run the outstanding checks.", "Come back and complete verification."],
  },
  checks_failed: {
    tone: "danger",
    icon: "x",
    title: "A check failed",
    steps: [
      "Review the failed check on the Verification tab.",
      "Return or reject the application, or ask a supervisor to override.",
    ],
  },
  not_assessed: {
    tone: "warning",
    icon: "clock",
    title: "Assessment needed",
    steps: ["Open the Assessment tab and save the credit assessment.", "Then submit for approval."],
  },
  incomplete: {
    tone: "warning",
    icon: "clock",
    title: "Application incomplete",
    steps: ["Add what's listed above on the Applicant & parties tab.", "Then submit the application again."],
  },
}

const BY_STATUS: Record<number, Omit<ErrorCopy, "description">> = {
  404: {
    tone: "danger",
    icon: "x",
    title: "Not found",
    steps: ["It may have been removed or you may not have access to it.", "Go back and open it again from the list."],
  },
  409: {
    tone: "warning",
    icon: "clock",
    title: "Can't do that right now",
    steps: [
      "Someone may have just changed this. Refresh to see the latest status.",
      "Check the Activity tab for what changed.",
    ],
  },
  422: {
    tone: "warning",
    icon: "clock",
    title: "Check the details",
    steps: ["Correct what's described above.", "Then try again."],
  },
}

const FALLBACK: Omit<ErrorCopy, "description"> = {
  tone: "danger",
  icon: "x",
  title: "Something went wrong",
  steps: ["Try again in a moment.", "If it keeps happening, contact MoneyLot support with the time it happened."],
}

export function errorCopy(error: unknown): ErrorCopy {
  if (isApiError(error)) {
    const base = BY_CODE[error.code] ?? BY_STATUS[error.status] ?? FALLBACK
    return { ...base, description: error.message }
  }
  return { ...FALLBACK, description: "We couldn't complete that. Your work hasn't been lost." }
}
