"use client"

import { ErrorState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWorkflowDefinitions } from "@/features/workflow/hooks/use-workflows"
import { AdminPage } from "./admin-page"
import { WorkflowEditor } from "./workflows/workflow-editor"

export function WorkflowsAdmin() {
  const { data, isPending, error, refetch } = useWorkflowDefinitions()
  return (
    <AdminPage
      title="Workflow builder"
      description="Approval stages, SLAs and amount limits for Retail and SME lending. Changes publish a new version; applications already in approval keep their route."
    >
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-128" />
      ) : (
        <Tabs defaultValue={data[0]?.id}>
          <TabsList>
            {data.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {data.map((d) => (
            <TabsContent key={d.id} value={d.id} className="mt-4">
              <WorkflowEditor key={`${d.id}-${d.version}`} definition={d} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </AdminPage>
  )
}
