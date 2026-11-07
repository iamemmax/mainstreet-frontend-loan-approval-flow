"use client"

import { Building2, CircleAlert, TriangleAlert, UserRound } from "lucide-react"
import type { ReactNode } from "react"
import { useFormContext } from "react-hook-form"
import { ErrorState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format/date"
import { maskPhone, maskValue } from "@/lib/format/mask"
import { isApiError } from "@/lib/api/errors"
import { useCustomerAccount, useFetchAccount } from "../../hooks/use-applications"
import type { Applicant, CustomerAccount } from "../../types"
import { applicantBvn } from "../../utils/applicant"
import type { FormValues } from "./schema"

/** A Retail loan needs a personal account; an SME loan needs a business account. */
export function accountFitsSegment(account: CustomerAccount, segment: FormValues["segment"]): boolean {
  return (account.holder.kind === "individual") === (segment === "retail")
}

/** The applicant step's fields for this person or business, e.g. the account holder's KYC record. */
export function applicantValues(holder: Applicant): Partial<FormValues> {
  const contact = { phone: holder.phone, email: holder.email, address: holder.address, state: holder.state }
  if (holder.kind === "individual") {
    return {
      firstName: holder.firstName,
      middleName: holder.middleName ?? "",
      lastName: holder.lastName,
      dateOfBirth: holder.dateOfBirth,
      gender: holder.gender,
      bvn: holder.bvn,
      nin: holder.nin,
      ...contact,
    }
  }
  return {
    businessName: holder.businessName,
    rcNumber: holder.rcNumber,
    tin: holder.tin,
    sector: holder.sector,
    activity: holder.activity,
    // Where it trades is usually where it's registered; the officer can change it.
    businessAddress: holder.address,
    yearsInOperation: String(holder.yearsInOperation),
    promoterName: holder.promoter.name,
    promoterBvn: holder.promoter.bvn,
    promoterNin: holder.promoter.nin,
    ...contact,
  }
}

/**
 * The account can take the loan and the applicant details on the form belong to it: it's active,
 * the right kind of account for the loan, and the details were filled in from its holder.
 */
export function accountReady(
  account: CustomerAccount | undefined,
  segment: FormValues["segment"],
  values: Pick<FormValues, "bvn" | "promoterBvn">,
): boolean {
  if (!account || account.status !== "active" || !accountFitsSegment(account, segment)) return false
  const formBvn = segment === "retail" ? values.bvn : values.promoterBvn
  return applicantBvn(account.holder) === formBvn
}

/**
 * The account number, then the account it finds. As soon as an account is found its holder's
 * details fill in the form, so the officer never retypes what the bank already holds.
 */
export function AccountLookup({ segment }: { segment: FormValues["segment"] }) {
  const form = useFormContext<FormValues>()
  const fetchAccount = useFetchAccount()
  const accountNumber = form.watch("accountNumber") ?? ""
  const lookup = useCustomerAccount(accountNumber)
  const complete = /^\d{10}$/.test(accountNumber)

  const lookUp = async (typed: string) => {
    if (!/^\d{10}$/.test(typed)) return
    try {
      const account = await fetchAccount(typed)
      // Ignore a slow answer for a number that has since been changed.
      if (form.getValues("accountNumber") !== typed) return
      form.reset({ ...form.getValues(), ...applicantValues(account.holder) }, { keepDefaultValues: true })
    } catch {
      // The card below shows "not found" or the error with a retry.
    }
  }

  return (
    <>
      <FormField
        control={form.control}
        name="accountNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Current account number</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                inputMode="numeric"
                maxLength={10}
                className="tabular"
                onChange={(event) => {
                  const typed = event.target.value.replace(/\D/g, "")
                  field.onChange(typed)
                  void lookUp(typed)
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="sm:col-span-2 empty:hidden">
        {complete && lookup.isPending && <Skeleton className="h-28 w-full rounded-xl" />}
        {complete && lookup.error && <LookupError error={lookup.error} onRetry={() => void lookUp(accountNumber)} />}
        {complete && lookup.data && <AccountCard account={lookup.data} segment={segment} />}
      </div>
    </>
  )
}

/** "Not found" is the customer's number being wrong, so it reads as a hint, not a failure. */
function LookupError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isApiError(error) && error.status === 404) {
    return (
      <p className="flex items-center gap-2 text-sm text-destructive">
        <CircleAlert className="size-4 shrink-0" aria-hidden />
        No current account with that number. Check it with the customer.
      </p>
    )
  }
  return <ErrorState error={error} onRetry={onRetry} title="Couldn't look up the account" size="sm" />
}

/** The account found, whether it's active, and a warning if it can't be used for this loan. */
function AccountCard({ account, segment }: { account: CustomerAccount; segment: FormValues["segment"] }) {
  const personal = account.holder.kind === "individual"
  const Icon = personal ? UserRound : Building2
  const rows: [string, ReactNode][] = [
    ["Account type", personal ? "Personal current account" : "Business current account"],
    ["Opened", formatDate(account.openedOn, "d MMM yyyy")],
    [
      personal ? "BVN" : "Promoter BVN",
      <span key="bvn" className="font-mono">
        {maskValue(applicantBvn(account.holder), { visibleEnd: 4 })}
      </span>,
    ],
    ["Phone", maskPhone(account.holder.phone)],
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/80">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{account.accountName}</div>
            <div className="font-mono text-xs text-muted-foreground">{account.accountNumber}</div>
          </div>
          <ToneBadge tone={account.status === "active" ? "success" : "danger"} dot className="ml-auto">
            {account.status === "active" ? "Active" : "Dormant"}
          </ToneBadge>
        </div>
        <dl className="grid gap-x-6 gap-y-2 px-4 py-3 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {account.status !== "active" && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          This account is dormant and can&apos;t take a loan. The customer needs to reactivate it at the branch first.
        </p>
      )}
      {account.status === "active" && !accountFitsSegment(account, segment) && (
        <p className="flex items-start gap-2 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {personal
            ? "This is a personal account. Use a business account for an SME loan, or go back and choose Retail."
            : "This is a business account. Use a personal account for a Retail loan, or go back and choose SME."}
        </p>
      )}
    </div>
  )
}
