export const TABS = ["pending", "delegated", "returned", "overdue"] as const

export type Tab = (typeof TABS)[number]

export const TAB_META: Record<Tab, { label: string; title: string; hint: string }> = {
  pending: { label: "Pending", title: "Awaiting your decision", hint: "Most urgent SLA first" },
  delegated: { label: "Delegated", title: "Delegated to you", hint: "Decided on behalf of a colleague" },
  returned: { label: "Returned", title: "Returned to you", hint: "Correct and resubmit" },
  overdue: { label: "Overdue", title: "Past their SLA", hint: "Act on these first" },
}

export const EMPTY: Record<Tab, { title: string; description: string }> = {
  pending: { title: "Nothing waiting for you", description: "New approvals assigned to your role will appear here." },
  delegated: {
    title: "No delegated approvals",
    description: "When a colleague delegates their approvals to you, they show up here.",
  },
  returned: {
    title: "Nothing returned to you",
    description: "Applications sent back for correction or more information will appear here.",
  },
  overdue: { title: "No overdue approvals", description: "Everything in your queue is within its SLA." },
}
