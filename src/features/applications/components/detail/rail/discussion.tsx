"use client"

import { MessagesSquare } from "lucide-react"
import { ToneBadge } from "@/components/shared/status-badge"
import type { Tone } from "@/components/shared/tone"
import type { User } from "@/features/auth/types"
import { DECISION_ACTION_LABELS, DECISION_REASONS } from "@/features/workflow/engine"
import type { WorkflowDefinition } from "@/features/workflow/types"
import { formatDateTime, formatRelative } from "@/lib/format/date"
import { initials } from "@/lib/format/name"
import { ROLE_LABELS } from "@/lib/rbac/roles"
import { cn } from "@/lib/utils"
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

/** Staff messages plus every decision comment, oldest first, so the thread reads like the file's history. */
function entries(app: Application, definition?: WorkflowDefinition): Entry[] {
  const messages: Entry[] = app.messages.map((m) => ({
    id: m.id,
    authorId: m.authorId,
    at: m.at,
    body: m.body,
    tag:
      m.kind === "rejection"
        ? { label: `Rejected · ${reasonLabel("reject", m.reasonCode) ?? "—"}`, tone: "danger" }
        : m.kind === "return"
          ? { label: `Returned · ${reasonLabel("return", m.reasonCode) ?? "—"}`, tone: "warning" }
          : null,
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

/** The conversation between staff on this application. The composer sits at the foot of the panel. */
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
  const items = entries(app, definition)
  const userOf = (id: string | null) => users.find((u) => u.id === id)

  return (
    <RailSection
      title="Discussion"
      aside={
        items.length > 0 && <span className="tabular text-xs font-medium text-muted-foreground">{items.length}</span>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center">
          <MessagesSquare className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs text-muted-foreground text-pretty">
            Ask a question or leave a note. Everyone who has worked on this application is notified.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {items.map((e) => {
            const mine = e.authorId === meId
            const author = userOf(e.authorId)
            return (
              <li key={e.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    mine ? "bg-primary text-primary-foreground" : "bg-primary/[0.08] text-primary",
                  )}
                >
                  {initials(author?.name ?? "System")}
                </span>
                <div className={cn("min-w-0 max-w-[85%] space-y-1", mine && "items-end text-right")}>
                  <div className={cn("flex flex-wrap items-baseline gap-x-1.5 text-xs", mine && "justify-end")}>
                    <span className="font-semibold text-foreground">{mine ? "You" : (author?.name ?? "System")}</span>
                    {!mine && author && <span className="text-muted-foreground">{ROLE_LABELS[author.role]}</span>}
                    <time dateTime={e.at} title={formatDateTime(e.at)} className="text-muted-foreground">
                      · {formatRelative(e.at)}
                    </time>
                  </div>
                  {e.tag && (
                    <div className={cn("flex", mine && "justify-end")}>
                      <ToneBadge tone={e.tag.tone} dot>
                        {e.tag.label}
                      </ToneBadge>
                    </div>
                  )}
                  <p
                    className={cn(
                      "inline-block rounded-2xl px-3 py-2 text-left text-[13px] leading-relaxed whitespace-pre-line text-pretty",
                      mine ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted",
                    )}
                  >
                    {e.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </RailSection>
  )
}
