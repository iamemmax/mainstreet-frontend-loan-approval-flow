"use client"

import {
  Activity,
  CircleCheck,
  Fingerprint,
  Landmark,
  Loader2,
  MessageSquare,
  ScanSearch,
  TriangleAlert,
} from "lucide-react"
import { useState, type ComponentType } from "react"
import { toast } from "sonner"
import { ToneBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelative } from "@/lib/format/date"
import { AdminPage } from "./admin-page"

interface Integration {
  id: string
  name: string
  purpose: string
  icon: ComponentType<{ className?: string }>
  status: "operational" | "degraded"
  latencyMs: number
  uptime: string
  callsToday: number
}

const INTEGRATIONS: Integration[] = [
  {
    id: "prembly",
    name: "Prembly",
    purpose: "BVN, NIN and CAC identity verification",
    icon: Fingerprint,
    status: "operational",
    latencyMs: 420,
    uptime: "99.96%",
    callsToday: 184,
  },
  {
    id: "yournotify",
    name: "Yournotify",
    purpose: "SMS and email delivery to staff and customers",
    icon: MessageSquare,
    status: "operational",
    latencyMs: 210,
    uptime: "99.99%",
    callsToday: 612,
  },
  {
    id: "crc",
    name: "CRC Credit Bureau",
    purpose: "Consumer and commercial credit reports",
    icon: ScanSearch,
    status: "degraded",
    latencyMs: 2840,
    uptime: "98.70%",
    callsToday: 73,
  },
  {
    id: "firstcentral",
    name: "FirstCentral Credit Bureau",
    purpose: "Secondary bureau for credit history",
    icon: ScanSearch,
    status: "operational",
    latencyMs: 960,
    uptime: "99.82%",
    callsToday: 71,
  },
  {
    id: "core-banking",
    name: "Core banking",
    purpose: "Account lookup and disbursement booking",
    icon: Landmark,
    status: "operational",
    latencyMs: 180,
    uptime: "99.98%",
    callsToday: 39,
  },
]

export function IntegrationsAdmin() {
  const [checked, setChecked] = useState<Record<string, Date>>(() =>
    Object.fromEntries(INTEGRATIONS.map((i, n) => [i.id, new Date(Date.now() - (n + 2) * 60_000)])),
  )
  const [testing, setTesting] = useState<string | null>(null)

  const test = (i: Integration) => {
    setTesting(i.id)
    setTimeout(() => {
      setTesting(null)
      setChecked((c) => ({ ...c, [i.id]: new Date() }))
      if (i.status === "degraded") toast.warning(`${i.name} responded slowly (${(i.latencyMs / 1000).toFixed(1)}s)`)
      else toast.success(`${i.name} connection OK · ${i.latencyMs}ms`)
    }, 900)
  }

  return (
    <AdminPage title="Integrations" description="Connection health for the external services the platform depends on.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((i) => (
          <Card key={i.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                  <i.icon className="size-5 text-muted-foreground" />
                </span>
                {i.status === "operational" ? (
                  <ToneBadge tone="success" icon={<CircleCheck aria-hidden />}>
                    Operational
                  </ToneBadge>
                ) : (
                  <ToneBadge tone="warning" icon={<TriangleAlert aria-hidden />}>
                    Degraded
                  </ToneBadge>
                )}
              </div>
              <CardTitle className="pt-2">{i.name}</CardTitle>
              <CardDescription>{i.purpose}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Latency", `${i.latencyMs}ms`],
                  ["Uptime (30d)", i.uptime],
                  ["Calls today", String(i.callsToday)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-muted/40 px-2 py-2">
                    <dt className="text-[11px] text-muted-foreground">{k}</dt>
                    <dd className="tabular text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Checked {formatRelative(checked[i.id])}</span>
                <Button size="sm" variant="outline" onClick={() => test(i)} disabled={testing === i.id}>
                  {testing === i.id ? <Loader2 className="animate-spin" aria-hidden /> : <Activity aria-hidden />}
                  Test connection
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPage>
  )
}
