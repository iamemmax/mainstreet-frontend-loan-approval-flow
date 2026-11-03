"use client"

import { toast } from "sonner"
import { ErrorState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { formatNaira, formatPercent } from "@/lib/format/money"
import { useReferenceData, useUpdateProduct } from "../hooks/use-reference-data"
import { AdminPage } from "./admin-page"

export function ProductsAdmin() {
  const { data: ref, isPending, error, refetch } = useReferenceData()
  const update = useUpdateProduct()
  return (
    <AdminPage
      title="Products"
      description="Loan products, pricing and limits. Inactive products can't be chosen for new applications."
    >
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ref.products.map((p) => (
            <Card key={p.id} className={p.active ? undefined : "opacity-70"}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{p.code}</CardDescription>
                  </div>
                  <ToneBadge tone={p.segment === "sme" ? "accent" : "info"}>
                    {p.segment === "sme" ? "SME" : "Retail"}
                  </ToneBadge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="tabular text-2xl font-semibold">{formatPercent(p.monthlyRateBps / 10_000, 2)}</div>
                  <div className="text-xs text-muted-foreground">monthly flat rate</div>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd className="tabular font-medium">
                      {formatNaira(p.minAmount, "compact")} – {formatNaira(p.maxAmount, "compact")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tenor</dt>
                    <dd className="tabular font-medium">
                      {p.minTenorMonths}–{p.maxTenorMonths} months
                    </dd>
                  </div>
                  {p.fees.map((f) => (
                    <div key={f.code} className="flex justify-between">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="tabular font-medium">{formatPercent(f.rateBps / 10_000, 2)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between border-t pt-4">
                  <Label htmlFor={`active-${p.id}`} className="text-sm">
                    {p.active ? "Active" : "Inactive"}
                  </Label>
                  <Switch
                    id={`active-${p.id}`}
                    checked={p.active}
                    disabled={update.isPending}
                    onCheckedChange={(active) =>
                      update.mutate(
                        { id: p.id, patch: { active } },
                        { onSuccess: () => toast.success(`${p.name} ${active ? "activated" : "deactivated"}`) },
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  )
}
