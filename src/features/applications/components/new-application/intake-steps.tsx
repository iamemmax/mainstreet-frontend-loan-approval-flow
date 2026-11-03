"use client"

import { Building2, UserRound } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { formatNaira } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { useCustomerAccount } from "../../hooks/use-applications"
import { AccountLookup, accountReady } from "./account-lookup"
import { ContactFields, Section, SelectField, TextField } from "./fields"
import type { FormValues } from "./schema"

/** Step 1: segment, product, amount, tenor, branch and purpose. */
export function LoanStep() {
  const form = useFormContext<FormValues>()
  const { data: ref } = useReferenceData()
  const segment = form.watch("segment")
  const product = ref?.products.find((p) => p.id === form.watch("productId"))
  return (
    <Section title="Loan details" description="Choose the segment and product, then the amount and tenor.">
      <FormField
        control={form.control}
        name="segment"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Segment</FormLabel>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
              {(["retail", "sme"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={field.value === s}
                  onClick={() => {
                    field.onChange(s)
                    form.setValue("productId", "")
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    field.value === s ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  {s === "retail" ? (
                    <UserRound className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  ) : (
                    <Building2 className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  )}
                  <span>
                    <span className="block text-sm font-medium">{s === "retail" ? "Retail" : "SME"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s === "retail" ? "Salaried individuals and consumers" : "Registered small and medium businesses"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </FormItem>
        )}
      />
      <SelectField
        name="productId"
        label="Product"
        span
        options={
          ref?.products.filter((p) => p.segment === segment && p.active).map((p) => ({ value: p.id, label: p.name })) ??
          []
        }
        description={
          product &&
          `${formatNaira(product.minAmount, "compact")} – ${formatNaira(product.maxAmount, "compact")} · ${product.minTenorMonths}–${product.maxTenorMonths} months · ${(product.monthlyRateBps / 100).toFixed(2)}% monthly`
        }
      />
      <TextField name="amount" label="Amount requested (₦)" grouped />
      <TextField name="tenor" label="Tenor (months)" grouped />
      <SelectField
        name="branchId"
        label="Branch"
        options={ref?.branches.map((b) => ({ value: b.id, label: b.name })) ?? []}
      />
      <SelectField
        name="agentId"
        label="Referring agent"
        options={[
          { value: "none", label: "None — direct" },
          ...(ref?.agents.map((a) => ({ value: a.id, label: a.name })) ?? []),
        ]}
      />
      <FormField
        control={form.control}
        name="purpose"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Purpose</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="e.g. Working capital to restock inventory" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Section>
  )
}

/**
 * Step 2: the current account first, then the person or business it belongs to. The details stay
 * blurred until the account is found; identity comes from its KYC record, contact details can be updated.
 */
export function ApplicantStep({ segment }: { segment: FormValues["segment"] }) {
  const form = useFormContext<FormValues>()
  const account = useCustomerAccount(form.watch("accountNumber") ?? "")
  const ready = accountReady(account.data, segment, { bvn: form.watch("bvn"), promoterBvn: form.watch("promoterBvn") })
  return (
    <Section
      title={segment === "retail" ? "Applicant" : "Business"}
      description="Enter the customer's current account number. Their details are filled in from the account."
    >
      <AccountLookup segment={segment} />
      <fieldset
        disabled={!ready}
        inert={!ready}
        aria-label={segment === "retail" ? "Applicant details" : "Business details"}
        className={cn(
          "grid gap-5 transition-[filter,opacity] duration-300 sm:col-span-2 sm:grid-cols-2",
          !ready && "opacity-60 blur-[3px] select-none",
        )}
      >
        {segment === "retail" ? <PersonFields /> : <BusinessFields />}
        <ContactFields />
      </fieldset>
    </Section>
  )
}

/** A personal account holder's identity, read-only because it comes from the bank's KYC record. */
function PersonFields() {
  return (
    <>
      <TextField name="firstName" label="First name" readOnly />
      <TextField name="middleName" label="Middle name" readOnly />
      <TextField name="lastName" label="Last name" readOnly />
      <TextField name="dateOfBirth" label="Date of birth" type="date" readOnly />
      <SelectField
        name="gender"
        label="Gender"
        disabled
        options={[
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
        ]}
      />
      <TextField name="bvn" label="BVN" numeric readOnly />
      <TextField name="nin" label="NIN" numeric readOnly />
    </>
  )
}

/** A business account holder: registration and promoter from the record; sector and age can be updated. */
function BusinessFields() {
  return (
    <>
      <TextField name="businessName" label="Business name" span readOnly />
      <TextField name="rcNumber" label="RC number" readOnly />
      <TextField name="tin" label="TIN" readOnly />
      <TextField name="sector" label="Sector" />
      <TextField name="yearsInOperation" label="Years in operation" grouped />
      <TextField name="promoterName" label="Principal promoter" readOnly />
      <TextField name="promoterBvn" label="Promoter BVN" numeric readOnly />
      <TextField name="promoterNin" label="Promoter NIN" numeric readOnly />
    </>
  )
}

/** Step 3: what the affordability check runs on. */
export function IncomeStep({ segment }: { segment: FormValues["segment"] }) {
  const { data: ref } = useReferenceData()
  const banks = ref?.banks.map((bank) => ({ value: bank, label: bank })) ?? []
  return segment === "retail" ? (
    <Section title="Employment" description="Used for the affordability check.">
      <TextField name="employerName" label="Employer" />
      <TextField name="empSector" label="Sector" />
      <TextField name="jobTitle" label="Job title" />
      <TextField name="monthlyNetIncome" label="Monthly net income (₦)" grouped />
      <TextField name="employmentStartDate" label="Employed since" type="date" />
      <SelectField name="salaryBank" label="Salary bank" options={banks} />
    </Section>
  ) : (
    <Section title="Business financials" description="From the last 12 months of statements.">
      <TextField name="monthlyRevenue" label="Average monthly revenue (₦)" grouped />
      <TextField name="monthlyExpenses" label="Average monthly expenses (₦)" grouped />
      <TextField name="annualTurnover" label="Annual turnover (₦)" grouped />
      <SelectField name="primaryBank" label="Primary bank" options={banks} />
    </Section>
  )
}
