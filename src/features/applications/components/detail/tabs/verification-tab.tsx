"use client"

import {
  Banknote,
  CircleDashed,
  Fingerprint,
  Landmark,
  Play,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { usePinConfirm } from "@/components/shared/pin-confirm"
import { ToneBadge } from "@/components/shared/status-badge"
import { type Tone, TONE_TILE } from "@/components/shared/tone"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useCan } from "@/features/auth/hooks/use-session"
import { formatDateTime } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import { useRunChecks } from "../../../hooks/use-applications"
import { useIsOnDesk } from "../../../hooks/use-is-on-desk"
import type { Application, VerificationResult } from "../../../types"
import { requiredChecks } from "../../../utils/checks"
import { CHECK_GROUPS, CHECK_LABELS } from "../constants"
import { CHECK_STATUS, Count } from "../ui"

export function VerificationTab({ app }: { app: Application }) {
  const run = useRunChecks(app.id)
  const pin = usePinConfirm()
  const onDesk = useIsOnDesk(app)
  const canRun = useCan("verification:run") && onDesk
  const required = requiredChecks(app)
  const results = new Map(app.verification.map((v) => [v.kind, v]))
  const tally = { passed: 0, review: 0, failed: 0 }
  for (const k of required) {
    const r = results.get(k)
    if (r) tally[r.status]++
  }
  const notRun = required.length - tally.passed - tally.review - tally.failed
  const overall: { tone: Tone; title: string; detail: string } =
    tally.failed > 0
      ? {
          tone: "danger",
          title: `${tally.failed} check${tally.failed > 1 ? "s" : ""} failed`,
          detail: "Return the application or ask a supervisor to override.",
        }
      : tally.review > 0
        ? {
            tone: "warning",
            title: tally.review > 1 ? `${tally.review} checks need review` : "1 check needs review",
            detail: "Read the findings before you decide.",
          }
        : notRun > 0
          ? {
              tone: "neutral",
              title: `${notRun} of ${required.length} checks still to run`,
              detail:
                app.status === "in_verification"
                  ? "Run them to complete verification."
                  : "Verification hasn't started yet.",
            }
          : { tone: "success", title: "All checks passed", detail: "Identity, bureaus and screening are clear." }
  const OverallIcon =
    overall.tone === "success" ? ShieldCheck : overall.tone === "neutral" ? CircleDashed : TriangleAlert
  const lastRun = app.verification
    .map((v) => v.at)
    .sort()
    .at(-1)

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONE_TILE[overall.tone])}
            >
              <OverallIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">{overall.title}</h2>
              <p className="text-sm text-muted-foreground">
                {overall.detail}
                {lastRun && ` Last run ${formatDateTime(lastRun)}.`}
              </p>
            </div>
          </div>
          {canRun && app.status === "in_verification" && notRun > 0 && (
            <Button
              onClick={() =>
                pin.confirm({
                  title: `Run ${notRun} check${notRun === 1 ? "" : "s"}`,
                  icon: Play,
                  description:
                    "Identity, bureau and screening requests go to the providers in your name. Bureau enquiries are billed to the Bank.",
                  facts: [
                    { label: "Application", value: <span className="font-mono">{app.reference}</span> },
                    { label: "Checks", value: `${notRun} outstanding` },
                  ],
                  confirmLabel: "Run checks",
                  run: async (p) => {
                    await run.mutateAsync(p)
                    toast.success("Checks complete")
                  },
                })
              }
            >
              <Play aria-hidden />
              Run {notRun} check{notRun === 1 ? "" : "s"}
            </Button>
          )}
        </div>
        <div className="border-t px-6 py-4">
          <div
            className="flex h-2 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${tally.passed} passed, ${tally.review} need review, ${tally.failed} failed, ${notRun} not run`}
          >
            {(["passed", "review", "failed"] as const).map((k) =>
              tally[k] ? (
                <div
                  key={k}
                  className={cn("h-full border-r-2 border-card last:border-r-0", CHECK_STATUS[k].bar)}
                  style={{ width: `${(tally[k] / required.length) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
            <Count n={tally.passed} label="passed" />
            <Count n={tally.review} label="need review" />
            <Count n={tally.failed} label="failed" />
            <Count n={notRun} label="not run" />
          </div>
        </div>
      </Card>

      <CheckGroups required={required} results={results} />
    </div>
  )
}

const GROUP_ICON = {
  Identity: Fingerprint,
  "Income & statements": Banknote,
  "Credit bureaus": Landmark,
  Screening: ScanSearch,
} as const

/** The worst result in a group decides its colour: failed, then needs review, then not run. */
function groupStatus({
  failed,
  review,
  passed,
  total,
}: {
  failed: number
  review: number
  passed: number
  total: number
}): { tone: Tone; summary: string } {
  if (failed > 0) return { tone: "danger", summary: `${failed} failed` }
  if (review > 0) return { tone: "warning", summary: review === 1 ? "1 needs review" : `${review} need review` }
  if (passed === total) return { tone: "success", summary: "All passed" }
  return { tone: "neutral", summary: `${total - passed} not run` }
}

/** Four group tiles; picking one shows just that group's checks, so it reads in small pieces. */
function CheckGroups({
  required,
  results,
}: {
  required: VerificationResult["kind"][]
  results: Map<VerificationResult["kind"], VerificationResult>
}) {
  const groups = CHECK_GROUPS.map((g) => {
    const kinds = g.kinds.filter((k) => required.includes(k))
    const list = kinds.map((k) => results.get(k))
    const failed = list.filter((r) => r?.status === "failed").length
    const review = list.filter((r) => r?.status === "review").length
    const passed = list.filter((r) => r?.status === "passed").length
    const { tone, summary } = groupStatus({ failed, review, passed, total: kinds.length })
    return { ...g, kinds, passed, tone, summary }
  })
  // Open on the first group with something to look at.
  const [selected, setSelected] = useState(
    () =>
      (
        groups.find((g) => g.tone === "danger" || g.tone === "warning") ??
        groups.find((g) => g.tone === "neutral") ??
        groups[0]
      ).title,
  )
  const group = groups.find((g) => g.title === selected)!

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Check groups" className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-4">
        {groups.map((g) => {
          const Icon = GROUP_ICON[g.title as keyof typeof GROUP_ICON]
          const on = g.title === selected
          return (
            <button
              key={g.title}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSelected(g.title)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-[0_1px_2px_0_rgb(16_24_40/0.04)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary ring-1 ring-primary" : "border-border/80 hover:border-foreground/20",
              )}
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_TILE[g.tone])}>
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{g.title}</span>
                <span className="block text-xs text-muted-foreground">
                  <span className="tabular font-medium text-foreground">
                    {g.passed}/{g.kinds.length}
                  </span>{" "}
                  ·{" "}
                  <span
                    className={cn(g.tone === "danger" && "text-destructive", g.tone === "warning" && "text-warning")}
                  >
                    {g.summary}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-label={group.title} className="grid gap-3 @3xl:grid-cols-2">
        {group.kinds.map((k) => {
          const r = results.get(k)
          const st = r ? CHECK_STATUS[r.status] : null
          return (
            <article
              key={k}
              className={cn(
                "rounded-2xl border bg-card p-5 shadow-[0_1px_2px_0_rgb(16_24_40/0.04)]",
                r?.status === "failed"
                  ? "border-destructive/30"
                  : r?.status === "review"
                    ? "border-warning/40"
                    : "border-border/80",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    st ? TONE_TILE[st.tone] : TONE_TILE.neutral,
                  )}
                >
                  {st ? <st.icon className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{CHECK_LABELS[k].name}</h3>
                    {st ? (
                      <ToneBadge tone={st.tone}>{st.label}</ToneBadge>
                    ) : (
                      <ToneBadge tone="neutral">Not run</ToneBadge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{CHECK_LABELS[k].what}</p>
                </div>
              </div>
              <p className={cn("mt-4 text-sm", r ? "text-foreground" : "text-muted-foreground")}>
                {r ? r.detail : "This check hasn't run yet."}
              </p>
              {r && (
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                  {r.provider} · {formatDateTime(r.at)}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
