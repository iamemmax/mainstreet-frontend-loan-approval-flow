"use client"

import { ArrowRight, CalendarClock, Loader2, UserRoundCheck, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ToneBadge } from "@/components/shared/status-badge"
import { FormCard } from "@/components/shared/form-card"
import { usePinConfirm } from "@/components/shared/pin-confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUsers } from "@/features/admin/hooks/use-reference-data"
import { useSession } from "@/features/auth/hooks/use-session"
import { useMyDelegations } from "@/features/workflow/hooks/use-workflows"
import type { Delegation } from "@/features/workflow/types"
import { formatDate } from "@/lib/format/date"
import { initials } from "@/lib/format/name"
import { MAX_DELEGATION_DAYS } from "../../constants"
import { useAddDelegation, useCancelDelegation, useDelegateCandidates } from "../../hooks/use-settings"
import { newDelegationInputSchema } from "../../schemas"
import type { NewDelegationInput } from "../../types"

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY: NewDelegationInput = { toUserId: "", startsAt: today(), endsAt: today(), reason: "" }

function statusOf(d: Delegation, now = Date.now()) {
  if (new Date(d.endsAt).getTime() < now) return { label: "Ended", tone: "neutral" as const }
  if (new Date(d.startsAt).getTime() > now) return { label: "Scheduled", tone: "info" as const }
  return { label: "Active", tone: "success" as const }
}

/** Hand approvals to a colleague in the same role while away, and see who is covering for whom. */
export function DelegationSection() {
  const { user } = useSession()
  const { data: delegations = [] } = useMyDelegations()
  const { data: candidates = [] } = useDelegateCandidates()
  const { data: users = [] } = useUsers()
  const add = useAddDelegation()
  const cancel = useCancelDelegation()
  const pin = usePinConfirm()
  const [values, setValues] = useState<NewDelegationInput>(EMPTY)
  const [touched, setTouched] = useState(false)
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—"

  const parsed = newDelegationInputSchema.safeParse(values)
  const errors =
    touched && !parsed.success ? Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])) : {}
  const live = delegations.filter((d) => new Date(d.endsAt).getTime() >= Date.now())
  const given = live.filter((d) => d.fromUserId === user.id)
  const received = live.filter((d) => d.toUserId === user.id)
  const set =
    <K extends keyof NewDelegationInput>(key: K) =>
    (v: NewDelegationInput[K]) =>
      setValues((s) => ({ ...s, [key]: v }))

  const submit = () => {
    setTouched(true)
    if (!parsed.success) return
    const to = nameOf(parsed.data.toUserId)
    pin.confirm({
      title: "Delegate your approvals",
      icon: CalendarClock,
      description: `${to} can decide on your behalf during these dates. Their decisions are recorded as made for you.`,
      facts: [
        { label: "Covering", value: to },
        { label: "From", value: formatDate(parsed.data.startsAt) },
        { label: "Until", value: formatDate(parsed.data.endsAt) },
        { label: "Reason", value: parsed.data.reason },
      ],
      confirmLabel: "Delegate",
      run: async (p) => {
        await add.mutateAsync({ input: parsed.data, pin: p })
        setValues(EMPTY)
        setTouched(false)
        toast.success(`${to} is now covering your approvals`)
      },
    })
  }

  return (
    <>
      {received.length > 0 && (
        <FormCard
          title="You're covering for"
          description="Their approvals appear in your My work queue during these dates."
          bodyClassName="space-y-2.5"
        >
          {received.map((d) => (
            <DelegationRow
              key={d.id}
              delegation={d}
              name={nameOf(d.fromUserId)}
              icon={<UserRoundCheck className="size-4" aria-hidden />}
            />
          ))}
        </FormCard>
      )}

      <FormCard
        title="Out of office"
        description={`Hand your approvals to a colleague in the same role, for up to ${MAX_DELEGATION_DAYS} days.`}
        bodyClassName="space-y-5"
        footer={
          <Button onClick={submit} disabled={add.isPending}>
            {add.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Delegate approvals
          </Button>
        }
      >
        {given.length > 0 && (
          <div className="space-y-2.5">
            {given.map((d) => (
              <DelegationRow
                key={d.id}
                delegation={d}
                name={nameOf(d.toUserId)}
                icon={<ArrowRight className="size-4" aria-hidden />}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(d.id, { onSuccess: () => toast.success("Delegation cancelled") })}
                  >
                    <X aria-hidden /> Cancel
                  </Button>
                }
              />
            ))}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dlg-to">Covering colleague</Label>
            <Select value={values.toUserId} onValueChange={set("toUserId")}>
              <SelectTrigger id="dlg-to" className="w-full" aria-invalid={!!errors.toUserId}>
                <SelectValue placeholder={candidates.length ? "Choose a colleague" : "No one else holds your role"} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.toUserId && <p className="text-[13px] text-destructive">{errors.toUserId}</p>}
          </div>
          {(
            [
              ["startsAt", "From"],
              ["endsAt", "Until"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`dlg-${key}`}>{label}</Label>
              <Input
                id={`dlg-${key}`}
                type="date"
                min={today()}
                value={values[key]}
                onChange={(e) => set(key)(e.target.value)}
                aria-invalid={!!errors[key]}
              />
              {errors[key] && <p className="text-[13px] text-destructive">{errors[key]}</p>}
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dlg-reason">Reason</Label>
            <Textarea
              id="dlg-reason"
              rows={2}
              placeholder="e.g. Annual leave"
              value={values.reason}
              onChange={(e) => set("reason")(e.target.value)}
              aria-invalid={!!errors.reason}
            />
            {errors.reason && <p className="text-[13px] text-destructive">{errors.reason}</p>}
          </div>
        </div>
      </FormCard>
    </>
  )
}

function DelegationRow({
  delegation: d,
  name,
  icon,
  action,
}: {
  delegation: Delegation
  name: string
  icon: React.ReactNode
  action?: React.ReactNode
}) {
  const status = statusOf(d)
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-xs font-semibold text-primary">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">{icon}</span>
          {name}
          <ToneBadge tone={status.tone} dot>
            {status.label}
          </ToneBadge>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {formatDate(d.startsAt)} – {formatDate(d.endsAt)} · {d.reason}
        </div>
      </div>
      {action}
    </div>
  )
}
