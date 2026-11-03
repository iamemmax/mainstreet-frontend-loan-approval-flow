"use client"

import { ErrorState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount } from "@/lib/format/money"
import { useReferenceData, useUsers } from "../hooks/use-reference-data"
import { AdminPage } from "./admin-page"

export function BranchesAdmin() {
  const { data: ref, isPending, error, refetch } = useReferenceData()
  const { data: users } = useUsers()
  return (
    <AdminPage title="Branches & regions" description="The branch network, grouped by region.">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Network summary">
        <StatCard label="Regions" loading={isPending} value={ref && formatCount(ref.regions.length)} />
        <StatCard label="Branches" loading={isPending} value={ref && formatCount(ref.branches.length)} />
        <StatCard label="Field agents" loading={isPending} value={ref && formatCount(ref.agents.length)} />
      </section>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ref.regions.map((region) => {
            const branches = ref.branches.filter((b) => b.regionId === region.id)
            return (
              <Card key={region.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {region.name}
                    <span className="text-xs font-normal text-muted-foreground">
                      {branches.length} branch{branches.length === 1 ? "" : "es"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y rounded-lg border">
                    {branches.map((b) => {
                      const staff = users?.filter((u) => u.branchId === b.id && u.status !== "inactive").length ?? 0
                      const agents = ref.agents.filter((a) => a.branchId === b.id).length
                      return (
                        <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div>
                            <div className="text-sm font-medium">{b.name}</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-mono">{b.code}</span> · {b.state}
                            </div>
                          </div>
                          <div className="tabular text-right text-xs text-muted-foreground">
                            <div>{staff} staff</div>
                            <div>
                              {agents} agent{agents === 1 ? "" : "s"}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                    {branches.length === 0 && (
                      <li className="px-3 py-2.5 text-sm text-muted-foreground">No branches yet</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </AdminPage>
  )
}
