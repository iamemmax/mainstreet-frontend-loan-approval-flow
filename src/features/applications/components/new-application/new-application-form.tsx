"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, ArrowRight, Loader2, Save, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { formatNaira, nairaToKobo } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { useCreateApplication, useCustomerAccount, useSaveDraft } from "../../hooks/use-applications"
import { DOCUMENT_TYPE_LABELS, REQUIRED_DOCUMENTS } from "../../schemas/application"
import type { Application, Collateral, Guarantor, NextOfKin } from "../../types"
import {
  type DocumentDraft,
  DocumentsChecklist,
  emptyGuarantor,
  emptyNextOfKin,
  partiesErrors,
  PartiesStep,
} from "./parties-step"
import { accountReady } from "./account-lookup"
import { AffordabilityPreview } from "./affordability-preview"
import { ApplicantStep, IncomeStep, LoanStep } from "./intake-steps"
import { formValuesFrom } from "./from-application"
import { ReviewStep } from "./review-step"
import { StepProgress, StepRail } from "./step-rail"
import { formSchema, type FormValues } from "./schema"
import { APPLICANT_STEP, DOCUMENTS_STEP, INCOME_STEP, PARTIES_STEP, STEP_FIELDS, STEPS } from "./steps"
import { type IntakeExtras, toInput } from "./to-input"

interface NewApplicationFormProps {
  defaultBranchId?: string
  /** A saved draft to continue. Its details fill the form and saving updates it instead of creating another. */
  draft?: Application
}

/** The blank form for a new application. */
function blankValues(branchId: string): FormValues {
  return {
    segment: "retail",
    productId: "",
    amount: "",
    tenor: "",
    purpose: "",
    branchId,
    agentId: "none",
    accountNumber: "",
    phone: "",
    email: "",
    address: "",
    state: "",
  }
}

/** Where a draft picks up: the first step that still has something missing. */
function startingStep(draft: Application | undefined): number {
  if (!draft) return 0
  if (!draft.guarantors.length || !draft.nextOfKin) return PARTIES_STEP
  const missingDocs = REQUIRED_DOCUMENTS[draft.segment].some((t) => !draft.documents.some((d) => d.type === t))
  if (missingDocs) return DOCUMENTS_STEP
  return STEPS.length - 1
}

/** The intake wizard, for a new application or to finish a saved draft. */
export function NewApplicationForm({ defaultBranchId = "", draft }: NewApplicationFormProps) {
  const router = useRouter()
  const { data: ref } = useReferenceData()
  const create = useCreateApplication()
  const update = useSaveDraft(draft?.id ?? "")
  const save = draft ? update : create
  const pending = save.isPending
  const [step, setStep] = useState(() => startingStep(draft))
  // Every step of a draft has been through once, so any of them can be revisited.
  const [furthest, setFurthest] = useState(draft ? STEPS.length - 1 : 0)
  // Which way the step content slides in.
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const scroller = useRef<HTMLDivElement>(null)
  const [guarantors, setGuarantors] = useState<Guarantor[]>(() =>
    draft?.guarantors.length ? draft.guarantors : [emptyGuarantor()],
  )
  const [nextOfKin, setNextOfKin] = useState<NextOfKin>(() => draft?.nextOfKin ?? emptyNextOfKin())
  const [collateral, setCollateral] = useState<Collateral[]>(draft?.collateral ?? [])
  const [documents, setDocuments] = useState<DocumentDraft[]>(
    () => draft?.documents.map(({ type, fileName, sizeBytes }) => ({ type, fileName, sizeBytes })) ?? [],
  )
  const [showPartyErrors, setShowPartyErrors] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: draft ? formValuesFrom(draft) : blankValues(defaultBranchId),
  })
  const segment = form.watch("segment")
  const product = ref?.products.find((p) => p.id === form.watch("productId"))
  const accountNumber = form.watch("accountNumber") ?? ""
  const account = useCustomerAccount(accountNumber)
  // Until the applicant details come from a matching account, the later steps stay locked.
  const accountIsReady = accountReady(account.data, segment, {
    bvn: form.watch("bvn"),
    promoterBvn: form.watch("promoterBvn"),
  })
  const reachable = accountIsReady ? furthest : Math.min(furthest, APPLICANT_STEP)

  const partyErrors = partiesErrors(guarantors, nextOfKin, collateral, segment)
  const missingDocs = REQUIRED_DOCUMENTS[segment].filter((t) => !documents.some((d) => d.type === t))

  const next = async () => {
    // The account card already says why it can't be used (not found, or the wrong kind).
    if (step === APPLICANT_STEP && !accountIsReady) {
      form.setFocus("accountNumber")
      return
    }
    const ok = await form.trigger(STEP_FIELDS[segment][step], { shouldFocus: true })
    if (!ok) return
    if (step === PARTIES_STEP && Object.keys(partyErrors).length) {
      setShowPartyErrors(true)
      return
    }
    if (step === 0 && product) {
      const amount = nairaToKobo(Number(form.getValues("amount")))
      const tenor = Number(form.getValues("tenor"))
      if (amount < product.minAmount || amount > product.maxAmount) {
        form.setError(
          "amount",
          { message: `${product.name} lends ${formatNaira(product.minAmount)} – ${formatNaira(product.maxAmount)}` },
          { shouldFocus: true },
        )
        return
      }
      if (tenor < product.minTenorMonths || tenor > product.maxTenorMonths) {
        form.setError(
          "tenor",
          { message: `Tenor must be ${product.minTenorMonths}–${product.maxTenorMonths} months` },
          { shouldFocus: true },
        )
        return
      }
    }
    goTo(Math.min(step + 1, STEPS.length - 1))
  }

  const goTo = (index: number) => {
    setDirection(index < step ? "back" : "forward")
    setStep(index)
    setFurthest((f) => Math.max(f, index))
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const extras = (asDraft: boolean): IntakeExtras => ({
    // A draft keeps only the parties that are complete enough to store.
    guarantors: asDraft
      ? guarantors.filter((_, i) => !Object.keys(partyErrors).some((k) => k.startsWith(`guarantors.${i}.`)))
      : guarantors,
    nextOfKin: asDraft && Object.keys(partyErrors).some((k) => k.startsWith("nextOfKin.")) ? null : nextOfKin,
    documents,
    collateral: asDraft
      ? collateral.filter((_, i) => !Object.keys(partyErrors).some((k) => k.startsWith(`collateral.${i}.`)))
      : collateral,
    asDraft,
  })

  const saveDraft = async () => {
    // A draft needs the loan, account, applicant and income details; parties and documents can follow.
    const ok = await form.trigger(STEP_FIELDS[segment].slice(0, PARTIES_STEP).flat(), { shouldFocus: true })
    if (!ok) {
      toast.error("Complete the loan, account, applicant and income details to save a draft")
      return
    }
    try {
      const app = await save.mutateAsync(toInput(form.getValues(), extras(true)))
      toast.success(`Draft ${app.reference} saved`)
      router.push(`/applications/${app.id}`)
    } catch {
      // The error modal explains what went wrong.
    }
  }

  const submit = form.handleSubmit(async (values) => {
    if (missingDocs.length || Object.keys(partyErrors).length) {
      toast.error("Some details are missing — save as a draft, or complete them to submit")
      return
    }
    try {
      const app = await save.mutateAsync(toInput(values, extras(false)))
      toast.success(`Application ${app.reference} submitted`)
      router.push(`/applications/${app.id}`)
    } catch {
      // The error modal explains what went wrong.
    }
  })

  const amount = Number(form.watch("amount"))
  const tenor = Number(form.watch("tenor"))
  const summary = [
    { label: "Segment", value: segment === "sme" ? "SME" : "Retail" },
    ...(product ? [{ label: "Product", value: product.name }] : []),
    ...(amount > 0 ? [{ label: "Amount", value: formatNaira(nairaToKobo(amount)) }] : []),
    ...(tenor > 0 ? [{ label: "Tenor", value: `${tenor} months` }] : []),
    ...(accountIsReady && account.data ? [{ label: "Account", value: account.data.accountName }] : []),
  ]

  return (
     <div className="flex flex-col gap-6 lg:h-[calc(100svh-8.5rem)]">
      <PageHeader
        title={draft ? `Continue ${draft.reference}` : "New application"}
        description={
          draft
            ? "Finish the draft, then submit it to verification. Save as a draft to come back to it later."
            : "Capture a Retail or SME loan application. It goes to verification as soon as you submit."
        }
      />
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[19rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="lg:min-h-0">
          <div className="hidden h-full lg:block">
            <StepRail step={step} furthest={reachable} onStep={goTo} summary={summary} className="h-full" />
          </div>
          <div className="lg:hidden">
            <StepProgress step={step} />
          </div>
        </div>
        <FormProvider {...form}>
          <form
            onSubmit={(e) => (step === STEPS.length - 1 ? void submit(e) : (e.preventDefault(), void next()))}
            noValidate
            className="flex min-w-0 flex-col gap-5 lg:min-h-0"
          >
            {/* The only part that scrolls. A 1px inset keeps card borders and focus rings from being clipped. */}
            <div
              ref={scroller}
              className="-m-1 p-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]"
            >
              <div
                key={step}
                className={cn(
                  "flex min-h-full flex-col gap-5 duration-300 ease-out animate-in fade-in [&>*:last-child]:flex-1",
                  direction === "forward" ? "slide-in-from-right-6" : "slide-in-from-left-6",
                )}
              >
                {step === 0 && <LoanStep />}
                {step === APPLICANT_STEP && <ApplicantStep segment={segment} />}
                {step === INCOME_STEP && <IncomeStep segment={segment} />}
                {step === INCOME_STEP && <AffordabilityPreview product={product} />}

                {step === PARTIES_STEP && (
                  <PartiesStep
                    segment={segment}
                    guarantors={guarantors}
                    onGuarantors={setGuarantors}
                    nextOfKin={nextOfKin}
                    onNextOfKin={setNextOfKin}
                    collateral={collateral}
                    onCollateral={setCollateral}
                    errors={partyErrors}
                    showErrors={showPartyErrors}
                  />
                )}

                {step === DOCUMENTS_STEP && (
                  <DocumentsChecklist segment={segment} documents={documents} onChange={setDocuments} />
                )}

                {step === STEPS.length - 1 && (
                  <ReviewStep
                    values={form.getValues()}
                    productName={product?.name}
                    product={product}
                    guarantors={guarantors.length}
                    documents={documents.length}
                    missing={[
                      ...missingDocs.map((d) => DOCUMENT_TYPE_LABELS[d]),
                      ...(Object.keys(partyErrors).length ? ["guarantor or next-of-kin details"] : []),
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Pinned under the form on desktop; floats at the bottom of the screen on small ones. */}
            <div className="sticky bottom-4 z-10 flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card/90 px-4 py-3 shadow-[0_12px_32px_-12px_rgb(16_24_40/0.18)] backdrop-blur-md">
              <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0 || pending}>
                <ArrowLeft aria-hidden /> Back
              </Button>
              <div className="flex gap-2">
                {step >= PARTIES_STEP && (
                  <Button type="button" variant="outline" onClick={saveDraft} disabled={pending}>
                    <Save aria-hidden /> Save as draft
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button type="submit">
                    Continue <ArrowRight aria-hidden />
                  </Button>
                ) : (
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                    Submit application
                  </Button>
                )}
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}
