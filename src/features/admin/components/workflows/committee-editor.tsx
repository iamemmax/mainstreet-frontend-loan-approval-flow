"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { NumberInput } from "@/components/shared/number-input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { WorkflowStage } from "@/features/workflow/types"
import { ROLE_LABELS } from "@/lib/rbac/roles"
import { useUsers } from "../../hooks/use-reference-data"
import { STAGE_ROLES } from "./constants"

/** Turns a stage into a committee vote: pick named members and how many votes decide. */
export function CommitteeEditor({
  stage: s,
  onChange,
}: {
  stage: WorkflowStage
  onChange: (patch: Partial<WorkflowStage>) => void
}) {
  const { data: users } = useUsers()
  const eligible = (users ?? []).filter((u) => u.status !== "inactive" && STAGE_ROLES.includes(u.role))
  const c = s.committee
  const setMembers = (memberIds: string[]) =>
    onChange({
      committee: { memberIds, votesRequired: Math.min(c?.votesRequired ?? 1, Math.max(1, memberIds.length)) },
    })
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <Label className="flex items-center justify-between text-sm">
        <span>
          Committee vote
          <span className="block text-xs font-normal text-muted-foreground">
            Named members each vote; the stage closes once enough agree.
          </span>
        </span>
        <Switch
          checked={!!c}
          onCheckedChange={(on) =>
            onChange({
              committee: on
                ? {
                    memberIds: eligible
                      .filter((u) => s.approverRoles.includes(u.role))
                      .slice(0, 3)
                      .map((u) => u.id),
                    votesRequired: 2,
                  }
                : null,
            })
          }
          aria-label="Committee vote"
        />
      </Label>
      {c && (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {eligible.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={c.memberIds.includes(u.id)}
                  onCheckedChange={(v) =>
                    setMembers(v ? [...c.memberIds, u.id] : c.memberIds.filter((id) => id !== u.id))
                  }
                />
                {u.name} <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <NumberInput
              className="h-8 w-20"
              value={String(c.votesRequired)}
              onValueChange={(v) =>
                onChange({
                  committee: {
                    ...c,
                    votesRequired: Math.min(Math.max(1, Number(v || 1)), Math.max(1, c.memberIds.length)),
                  },
                })
              }
              aria-label="Votes required"
            />
            <span className="text-muted-foreground">of {c.memberIds.length} votes decide</span>
          </div>
        </>
      )}
    </div>
  )
}
