"use client"

import { Check } from "lucide-react"
import { FormCard } from "@/components/shared/form-card"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { useSession } from "@/features/auth/hooks/use-session"
import { initials } from "@/lib/format/name"
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/rbac/labels"
import { ROLE_LABELS } from "@/lib/rbac/roles"

export function ProfileSection() {
  const { user, permissions } = useSession()
  const { data: ref } = useReferenceData()
  const branch = ref?.branches.find((b) => b.id === user.branchId)
  const facts = [
    ["Full name", user.name],
    ["Work email", user.email],
    [
      "Staff ID",
      <span key="id" className="font-mono">
        {user.staffId}
      </span>,
    ],
    ["Role", ROLE_LABELS[user.role]],
    ["Branch", branch?.name ?? "—"],
    [
      "Account status",
      <span key="s" className="capitalize">
        {user.status}
      </span>,
    ],
  ] as const
  const groups = PERMISSION_GROUPS.map((g) => ({
    ...g,
    items: permissions.filter((p) => new RegExp(`^(${g.prefix})`).test(p)),
  })).filter((g) => g.items.length)

  return (
    <>
      <FormCard title="Profile" description="Your details are managed by your system administrator.">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
            {initials(user.name)}
          </span>
          <dl className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 truncate text-[15px] font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </FormCard>

      <FormCard title="What you can do" description={`Access that comes with the ${ROLE_LABELS[user.role]} role.`}>
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {g.label}
              </div>
              <ul className="mt-2 space-y-1.5">
                {g.items.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5 shrink-0 text-success" strokeWidth={3} aria-hidden />
                    {PERMISSION_LABELS[p]}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </FormCard>
    </>
  )
}
