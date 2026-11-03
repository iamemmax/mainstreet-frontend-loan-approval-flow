"use client"

import { Route } from "lucide-react"
import { useState } from "react"
import { MoneyText } from "@/components/shared/money-text"
import { NumberInput } from "@/components/shared/number-input"
import { ToneBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { simulateRoute } from "@/features/workflow/engine"
import type { WorkflowDefinition } from "@/features/workflow/types"
import { nairaToKobo } from "@/lib/format/money"

export function RouteSimulator({ definition }: { definition: WorkflowDefinition }) {
  const [amount, setAmount] = useState("2500000")
  const result = amount ? simulateRoute(definition, nairaToKobo(Number(amount))) : null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="size-4" aria-hidden /> Route simulator
        </CardTitle>
        <CardDescription>
          See which stages an application of a given amount passes through — including unpublished changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`sim-${definition.id}`}>Loan amount (₦)</Label>
          <NumberInput id={`sim-${definition.id}`} value={amount} onValueChange={setAmount} />
        </div>
        {!result ? (
          <p className="text-sm text-muted-foreground">Enter an amount to simulate.</p>
        ) : !result.ok ? (
          <p className="text-sm text-destructive">{result.message}</p>
        ) : (
          <div className="space-y-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              {result.route.stages.map((s, i) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  )}
                  <ToneBadge tone={s.key === result.route.finalStage.key ? "accent" : "neutral"}>{s.name}</ToneBadge>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground">
              <MoneyText value={nairaToKobo(Number(amount))} className="font-medium text-foreground" /> closes at{" "}
              <span className="font-medium text-foreground">{result.route.finalStage.name}</span>, with up to{" "}
              {result.route.totalSlaHours}h of SLA end to end.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
