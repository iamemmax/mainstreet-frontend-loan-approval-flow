"use client"

import { ChevronRight, Eye, Landmark, ScanFace, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { SLABadge, StatusBadge } from "@/components/shared/status-badge"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useReferenceData, useUsers } from "@/features/admin/hooks/use-reference-data"
import { computeSla, getStage } from "@/features/workflow/engine"
import { useWorkflowDefinitions } from "@/features/workflow/hooks/use-workflows"
import { setIntent } from "@/lib/navigation/intent"
import { useApplication } from "../../hooks/use-applications"
import { REQUIRED_DOCUMENTS } from "../../schemas/application"
import type { Application } from "../../types"
import { computeOffer } from "../../utils/offer"
import { applicantDisplayName } from "../detail/application-detail"
import { CreditHistorySummary } from "../credit-history-summary"
import { IdentityPhotos } from "../identity/identity-photos"
import { DocumentViewer } from "./document-viewer"
import { documentViewerItems } from "./viewer-items"
import {
  BorrowerSection,
  CreditSnapshotSection,
  DocumentsSection,
  GuarantorsSection,
  LoanSection,
} from "./sheet-sections"
import { SheetSection } from "./sheet-ui"

interface ApplicationSheetProps {
  id: string | null
  onClose: () => void
}

/** Quick look at an application from the list: who, what, the documents, and a way into the full page. */
export function ApplicationSheet({ id, onClose }: ApplicationSheetProps) {
  const router = useRouter()
  const { data: app, isPending } = useApplication(id ?? "")

  const openFull = (tab?: string) => {
    if (!id) return
    if (tab) setIntent("applicationTab", tab)
    router.push(`/applications/${id}`)
  }

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 bg-background p-0 sm:max-w-[28rem]">
        {isPending || !app ? <SheetSkeleton /> : <SheetBody app={app} onClose={onClose} onOpenFull={openFull} />}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({
  app,
  onClose,
  onOpenFull,
}: {
  app: Application
  onClose: () => void
  onOpenFull: (tab?: string) => void
}) {
  const { data: ref } = useReferenceData()
  const { data: users } = useUsers()
  const { data: definitions } = useWorkflowDefinitions()
  const [viewing, setViewing] = useState<number | null>(null)

  const name = applicantDisplayName(app)
  const product = ref?.products.find((p) => p.id === app.productId)
  const branch = ref?.branches.find((b) => b.id === app.branchId)
  const terms = product ? computeOffer(product, app.amountRequested, app.tenorMonths) : null
  const definition = definitions?.find((d) => d.id === app.workflow?.definitionId)
  const stage = definition && app.workflow?.currentStageKey ? getStage(definition, app.workflow.currentStageKey) : null
  const sla =
    stage && app.status === "pending_approval" && app.workflow?.stageEnteredAt
      ? computeSla(stage, new Date(app.workflow.stageEnteredAt), new Date())
      : null

  const items = documentViewerItems(app, name)
  const required = REQUIRED_DOCUMENTS[app.segment]
  const received = required.filter((t) => app.documents.some((d) => d.type === t)).length

  return (
    <>
      <header className="flex shrink-0 items-start gap-3 border-b bg-card px-5 py-4">
        <InitialsAvatar name={name} className="size-11 text-sm" />
        <div className="min-w-0 flex-1 space-y-1">
          <SheetTitle className="truncate text-base font-bold">{name}</SheetTitle>
          <SheetDescription className="truncate text-xs">
            <span className="font-mono">{app.reference}</span> · {branch?.name ?? "—"} branch
          </SheetDescription>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <StatusBadge status={app.status} icon />
            {sla && <SLABadge state={sla.state} dueAt={sla.dueAt} />}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => onOpenFull()}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-primary shadow-xs transition-colors hover:bg-primary/[0.04]"
        >
          <Eye className="size-4" aria-hidden /> Open full details page
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>

        <SheetSection icon={ScanFace} title="Identity check">
          <IdentityPhotos app={app} name={name} />
        </SheetSection>

        <DocumentsSection items={items} received={received} required={required.length} onView={setViewing} />

        <LoanSection
          app={app}
          productName={product?.name}
          terms={terms}
          officerName={users?.find((u) => u.id === app.officerId)?.name}
          agentName={ref?.agents.find((a) => a.id === app.agentId)?.name}
        />

        <BorrowerSection app={app} />

        {app.creditHistory && (
          <SheetSection icon={Landmark} title="Credit history">
            <CreditHistorySummary history={app.creditHistory} className="border-0 p-0" />
            <button
              type="button"
              onClick={() => onOpenFull("credit")}
              className="mt-3 text-[13px] font-medium text-primary hover:underline"
            >
              See every loan →
            </button>
          </SheetSection>
        )}

        <CreditSnapshotSection app={app} terms={terms} stageName={stage?.name} />

        <GuarantorsSection guarantors={app.guarantors} />
      </div>

      <DocumentViewer items={items} index={viewing} onIndexChange={setViewing} />
    </>
  )
}

function SheetSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true">
      <SheetTitle className="sr-only">Loading application</SheetTitle>
      <div className="flex gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  )
}
