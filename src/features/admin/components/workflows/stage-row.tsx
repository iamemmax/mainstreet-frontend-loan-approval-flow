"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Clock, GripVertical, Trash2, Users } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/shared/number-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { authorityLimitForStage, type ValidationIssue } from "@/features/workflow/engine"
import type { WorkflowDefinition, WorkflowStage } from "@/features/workflow/types"
import { formatNaira } from "@/lib/format/money"
import { type Role, ROLE_LABELS } from "@/lib/rbac/roles"
import { cn } from "@/lib/utils"
import { useUsers } from "../../hooks/use-reference-data"
import { CommitteeEditor } from "./committee-editor"
import { STAGE_ROLES } from "./constants"

interface StageRowProps {
  index: number
  stage: WorkflowStage
  definition: WorkflowDefinition
  editing: boolean
  issues: ValidationIssue[]
  onChange: (patch: Partial<WorkflowStage>) => void
  onRemove: () => void
}

export function StageRow({ index, stage: s, definition, editing, issues, onChange, onRemove }: StageRowProps) {
  const { data: users } = useUsers()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: s.key,
    disabled: !editing,
  })
  const limit = authorityLimitForStage(definition, s.key)
  const hasError = issues.some((i) => i.severity === "error")
  const toggleRole = (role: Role, on: boolean) => {
    const next = on ? [...s.approverRoles, role] : s.approverRoles.filter((r) => r !== role)
    if (next.length) onChange({ approverRoles: next, quorum: next.length === 1 ? "any" : s.quorum })
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex gap-3 rounded-lg border bg-card p-3",
        isDragging && "relative z-10 shadow-lg",
        hasError && "border-destructive/50",
      )}
    >
      {editing ? (
        <button
          type="button"
          className="mt-1 flex h-7 cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing"
          aria-label={`Reorder ${s.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {editing ? (
          <>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Stage name"
                value={s.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="h-8 font-medium"
              />
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${s.name}`} onClick={onRemove}>
                <Trash2 aria-hidden />
              </Button>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs text-muted-foreground">Who approves</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {STAGE_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={s.approverRoles.includes(r)} onCheckedChange={(v) => toggleRole(r, !!v)} />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
              {s.approverRoles.length > 1 && !s.committee && (
                <Select value={s.quorum} onValueChange={(v) => onChange({ quorum: v as WorkflowStage["quorum"] })}>
                  <SelectTrigger className="h-8 w-full sm:w-72" aria-label="Quorum">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All of them must approve (committee)</SelectItem>
                    <SelectItem value="any">Any one of them can approve</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </fieldset>
            <CommitteeEditor stage={s} onChange={onChange} />
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label="SLA (hours)"
                value={s.slaHours}
                min={1}
                onChange={(v) => onChange({ slaHours: Math.max(1, v) })}
              />
              <NumberField
                label="Reminder at (% of SLA)"
                value={s.reminderAtPercent}
                min={0}
                max={100}
                onChange={(v) => onChange({ reminderAtPercent: Math.min(100, Math.max(0, v)) })}
              />
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between text-xs">
                  Auto-escalate
                  <Switch
                    checked={s.autoEscalateAfterHours !== null}
                    onCheckedChange={(on) => onChange({ autoEscalateAfterHours: on ? 8 : null })}
                    aria-label="Auto-escalate after breach"
                  />
                </Label>
                <NumberInput
                  className="h-8"
                  disabled={s.autoEscalateAfterHours === null}
                  value={s.autoEscalateAfterHours === null ? "" : String(s.autoEscalateAfterHours)}
                  placeholder="Off"
                  onValueChange={(v) => onChange({ autoEscalateAfterHours: Number(v || 0) })}
                  aria-label="Hours after breach"
                />
              </div>
            </div>
            {issues.map((i) => (
              <p
                key={i.message}
                className={cn("text-xs", i.severity === "error" ? "text-destructive" : "text-warning")}
              >
                {i.message}
              </p>
            ))}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                Can close up to{" "}
                {limit === null ? "any amount" : limit === 0 ? "— (never final)" : formatNaira(limit, "compact")}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {s.committee
                  ? `${s.committee.memberIds.map((id) => users?.find((u) => u.id === id)?.name ?? id).join(", ")} · ${s.committee.votesRequired} of ${s.committee.memberIds.length} votes decide`
                  : s.approverRoles.map((r) => ROLE_LABELS[r]).join(s.quorum === "all" ? " + " : " or ")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {s.slaHours}h SLA · reminder at {s.reminderAtPercent}%
              </span>
              <span>
                {s.autoEscalateAfterHours === null
                  ? "No auto-escalation"
                  : `Auto-escalates ${s.autoEscalateAfterHours}h after breach`}
              </span>
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <NumberInput
        id={id}
        className="h-8"
        value={String(value)}
        aria-valuemin={min}
        aria-valuemax={max}
        onValueChange={(v) => onChange(Number(v || 0))}
      />
    </div>
  )
}
