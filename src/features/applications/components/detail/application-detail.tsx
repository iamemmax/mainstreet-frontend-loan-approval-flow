"use client"

import { ArrowLeft, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { ErrorState } from "@/components/shared/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useReferenceData, useUsers } from "@/features/admin/hooks/use-reference-data"
import { computeSla, getStage } from "@/features/workflow/engine"
import { useWorkflowDefinitions } from "@/features/workflow/hooks/use-workflows"
import { useNow } from "@/hooks/use-now"
import { pluralize } from "@/lib/format/money"
import { takeIntent } from "@/lib/navigation/intent"
import { cn } from "@/lib/utils"
import { useApplication } from "../../hooks/use-applications"
import type { Application } from "../../types"
import { computeOffer } from "../../utils/offer"
import { ApplicationActions, EligibilityNote } from "../application-actions"
import { FLAG_TEXT, type Tab, TAB_LABELS, TABS, visibleTabs } from "./constants"
import { ReviewRail } from "./review-rail"
import { SummaryHeader } from "./summary-header"
import { ActivityTab } from "./tabs/activity-tab"
import { ApplicantTab } from "./tabs/applicant-tab"
import { ApprovalsTab } from "./tabs/approvals-tab"
import { AssessmentTab } from "./tabs/assessment-tab"
import { CreditHistoryTab } from "./tabs/credit-history-tab"
import { OfferTab } from "./tabs/offer-tab"
import { OverviewTab } from "./tabs/overview-tab"
import { VerificationTab } from "./tabs/verification-tab"

export function applicantDisplayName(app: Application) {
  return app.applicant.kind === "individual"
    ? `${app.applicant.firstName} ${app.applicant.lastName}`
    : app.applicant.businessName
}

export function ApplicationDetail({ id }: { id: string }) {
  const { data: app, isPending, error, refetch } = useApplication(id)
  const { data: definitions } = useWorkflowDefinitions()
  const { data: ref } = useReferenceData()
  const { data: users } = useUsers()
  const [wantedTab, setTab] = useState<Tab>(() => {
    const wanted = takeIntent("applicationTab")
    return TABS.includes(wanted as Tab) ? (wanted as Tab) : "overview"
  })
  const now = useNow()

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't open this application" />
      </Card>
    )
  }
  if (isPending || !app) return <DetailSkeleton />
  const tabs = visibleTabs(app)
  // A tab can disappear (or be asked for before it exists); fall back to the overview.
  const tab = tabs.includes(wantedTab) ? wantedTab : "overview"

  const definition = definitions?.find((d) => d.id === app.workflow?.definitionId)
  const stage = definition && app.workflow?.currentStageKey ? getStage(definition, app.workflow.currentStageKey) : null
  const sla =
    stage && app.status === "pending_approval" && app.workflow?.stageEnteredAt
      ? computeSla(stage, new Date(app.workflow.stageEnteredAt), now)
      : null
  const product = ref?.products.find((p) => p.id === app.productId)
  const branch = ref?.branches.find((b) => b.id === app.branchId)
  const officer = users?.find((u) => u.id === app.officerId)
  const agent = ref?.agents.find((a) => a.id === app.agentId)
  const name = applicantDisplayName(app)

  const terms = product ? computeOffer(product, app.amountRequested, app.tenorMonths) : null
  const userName = (uid: string) => users?.find((u) => u.id === uid)?.name ?? "System"

  return (
    <div className="space-y-5">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to applications
      </Link>

      {/* The panel's top lines up with the summary card; it runs the full height beside the page. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <section
            aria-label="Application summary"
            className="@container rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]"
          >
            <SummaryHeader
              app={app}
              name={name}
              productName={product?.name}
              sla={sla}
              actions={
                // On wide screens the same actions live at the top of the review panel.
                <div className="relative mt-4 xl:hidden">
                  <ApplicationActions application={app} applicantName={name} stageName={stage?.name ?? null} />
                </div>
              }
            />
          </section>

          {app.flags.length > 0 && (
            <Alert className="rounded-xl border-warning/30 bg-warning/5">
              <TriangleAlert className="text-warning" aria-hidden />
              <AlertTitle>{pluralize(app.flags.length, "flag")} on this application</AlertTitle>
              <AlertDescription>
                <ul className="space-y-1">
                  {app.flags.map((flag) => (
                    <li key={flag}>
                      <span className="font-medium text-foreground">{FLAG_TEXT[flag].title}.</span>{" "}
                      {FLAG_TEXT[flag].body}
                      {flag === "duplicate_applicant" && app.duplicateOfId && (
                        <Link href={`/applications/${app.duplicateOfId}`} className="ml-1 font-medium underline">
                          Open the other application
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <EligibilityNote application={app} />

          <nav aria-label="Application sections" className="flex gap-7 overflow-x-auto border-b">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                aria-current={t === tab ? "page" : undefined}
                onClick={() => setTab(t)}
                className={cn(
                  "relative shrink-0 pt-1 pb-3.5 text-sm font-medium transition-colors outline-none focus-visible:text-foreground",
                  t === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TAB_LABELS[t]}
                {t === tab && (
                  <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </nav>

          {/* Tabs size themselves to this column, not the screen, since the review panel shares the row. */}
          <div className="@container min-w-0">
            {tab === "overview" && (
              <OverviewTab
                app={app}
                product={product}
                branch={branch}
                officer={officer}
                agent={agent}
                terms={terms}
                onOpenTab={setTab}
              />
            )}

            {tab === "applicant" && <ApplicantTab app={app} />}

            {tab === "verification" && <VerificationTab app={app} />}

            {tab === "credit" && <CreditHistoryTab app={app} />}

            {tab === "assessment" &&
              (product ? (
                <AssessmentTab key={app.assessment?.updatedAt ?? "new"} app={app} product={product} />
              ) : (
                <Skeleton className="h-64 w-full" />
              ))}

            {tab === "workflow" && <ApprovalsTab app={app} definition={definition} userName={userName} />}

            {tab === "offer" &&
              (product ? <OfferTab app={app} product={product} /> : <Skeleton className="h-64 w-full" />)}

            {tab === "activity" && <ActivityTab id={app.id} />}
          </div>
        </div>

        <ReviewRail
          app={app}
          product={product}
          stage={stage}
          definition={definition}
          applicantName={name}
          className="max-xl:max-h-[48rem] xl:sticky xl:top-[6.5rem] xl:h-[calc(100svh-10rem)]"
        />
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-6 w-96" />
      </div>
      <Skeleton className="h-9 w-96" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
