"use client"

import { MessageSquareText, RefreshCw } from "lucide-react"
import { ToneBadge } from "@/components/shared/status-badge"
import type { Tone } from "@/components/shared/tone"
import { Button } from "@/components/ui/button"
import type { User } from "@/features/auth/types"
import { DECISION_ACTION_LABELS, DECISION_REASONS } from "@/features/workflow/engine"
import type { WorkflowDefinition } from "@/features/workflow/types"
import { formatDateTime, formatRelative } from "@/lib/format/date"
import { initials } from "@/lib/format/name"
import { ROLE_LABELS } from "@/lib/rbac/roles"
import { cn } from "@/lib/utils"
import { useApplication } from "../../../hooks/use-applications"
import type { Application } from "../../../types"
import { DECISION_TONE } from "../constants"
import { RailSection } from "./ui"

interface Entry {
  id: string
  authorId: string | null
  at: string
  body: string
  tag: { label: string; tone: Tone } | null
}

const reasonLabel = (action: keyof typeof DECISION_REASONS, code: string | null) =>
  DECISION_REASONS[action].find((r) => r.code === code)?.label

/** The badge on a rejection or return comment; plain comments have none. */
function messageTag(message: Application["messages"][number]): Entry["tag"] {
  if (message.kind === "rejection") {
    return { label: `Rejected · ${reasonLabel("reject", message.reasonCode) ?? "—"}`, tone: "danger" }
  }
  if (message.kind === "return") {
    return { label: `Returned · ${reasonLabel("return", message.reasonCode) ?? "—"}`, tone: "warning" }
  }
  return null
}

/** Staff comments plus every decision comment, oldest first, so they read like the file's history. */
function entries(app: Application, definition?: WorkflowDefinition): Entry[] {
  const messages: Entry[] = app.messages.map((m) => ({
    id: m.id,
    authorId: m.authorId,
    at: m.at,
    body: m.body,
    tag: messageTag(m),
  }))
  const decisions: Entry[] = (app.workflow?.decisions ?? [])
    .filter((d) => !d.automated && d.comment)
    .map((d) => ({
      id: d.id,
      authorId: d.actorId,
      at: d.at,
      body: d.comment,
      tag: {
        label: `${DECISION_ACTION_LABELS[d.action]} · ${definition?.stages.find((s) => s.key === d.stageKey)?.name ?? d.stageKey}`,
        tone: DECISION_TONE[d.action],
      },
    }))
  return [...messages, ...decisions].sort((a, b) => a.at.localeCompare(b.at))
}

/** Comments staff leave on this application, with a button to check for new ones. The comment box sits below. */
export function Discussion({
  app,
  definition,
  users,
  meId,
}: {
  app: Application
  definition?: WorkflowDefinition
  users: User[]
  meId: string
}) {
  const { refetch, isFetching } = useApplication(app.id)
  const items = entries(app, definition)
  const userOf = (id: string | null) => users.find((u) => u.id === id)

  return (
    <RailSection
      title={items.length > 0 ? `Comments · ${items.length}` : "Comments"}
      aside={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh comments"
          title="Refresh comments"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCw className={cn(isFetching && "animate-spin")} aria-hidden />
        </Button>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center">
          <MessageSquareText className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No comments yet</p>
          <p className="text-xs text-muted-foreground text-pretty">
            Leave a comment for the team. Everyone who has worked on this application is notified.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-border/70">
          {items.map((e) => {
            const author = userOf(e.authorId)
            const name = author?.name ?? "System"
            return (
              <li key={e.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-[10px] font-semibold text-primary"
                >
                  {initials(name)}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
                    <span className="font-semibold text-foreground">{e.authorId === meId ? "You" : name}</span>
                    {author && <span className="text-muted-foreground">{ROLE_LABELS[author.role]}</span>}
                    <time dateTime={e.at} title={formatDateTime(e.at)} className="text-muted-foreground">
                      · {formatRelative(e.at)}
                    </time>
                  </div>
                  {e.tag && (
                    <ToneBadge tone={e.tag.tone} dot>
                      {e.tag.label}
                    </ToneBadge>
                  )}
                  <p className="text-[13px] leading-relaxed whitespace-pre-line text-pretty">{e.body}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </RailSection>
  )
}
