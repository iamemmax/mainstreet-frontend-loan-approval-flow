"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Loader2, Pencil, Plus, Save, Trash2, TriangleAlert, Undo2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ToneBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCan } from "@/features/auth/hooks/use-session"
import { validateWorkflow } from "@/features/workflow/engine"
import { usePublishWorkflow } from "@/features/workflow/hooks/use-workflows"
import type { ApprovalBand, WorkflowDefinition, WorkflowStage } from "@/features/workflow/types"
import { formatDate } from "@/lib/format/date"
import { formatNaira } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { useUsers } from "../../hooks/use-reference-data"
import { NairaInput } from "./naira-input"
import { RouteSimulator } from "./route-simulator"
import { StageRow } from "./stage-row"

function newStageKey(name: string, existing: string[]) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "stage"
  let key = base
  for (let i = 2; existing.includes(key); i++) key = `${base}_${i}`
  return key
}

export function WorkflowEditor({ definition }: { definition: WorkflowDefinition }) {
  const { data: users } = useUsers()
  const canEdit = useCan("admin:workflow")
  const publish = usePublishWorkflow()
  const [draft, setDraft] = useState<WorkflowDefinition | null>(null)
  const editing = draft !== null
  const d = draft ?? definition
  const validation = validateWorkflow(d)
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(definition)
  const issuesFor = (prefix: string) =>
    validation.issues.filter((i) => i.path === prefix || i.path.startsWith(`${prefix}.`))

  const update = (fn: (w: WorkflowDefinition) => WorkflowDefinition) => setDraft((w) => (w ? fn(w) : w))
  const setStage = (key: string, patch: Partial<WorkflowStage>) =>
    update((w) => ({ ...w, stages: w.stages.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))
  const setBand = (id: string, patch: Partial<ApprovalBand>) =>
    update((w) => ({ ...w, bands: w.bands.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    update((w) => {
      const from = w.stages.findIndex((s) => s.key === active.id)
      const to = w.stages.findIndex((s) => s.key === over.id)
      return { ...w, stages: arrayMove(w.stages, from, to) }
    })
  }

  const addStage = () =>
    update((w) => {
      const name = "New stage"
      return {
        ...w,
        stages: [
          ...w.stages,
          {
            key: newStageKey(
              name,
              w.stages.map((s) => s.key),
            ),
            name,
            approverRoles: ["credit_manager"],
            quorum: "any",
            slaHours: 24,
            reminderAtPercent: 75,
            autoEscalateAfterHours: null,
            committee: null,
          },
        ],
      }
    })

  const addBand = () =>
    update((w) => {
      const sorted = [...w.bands].sort((a, b) => a.minAmount - b.minAmount)
      const top = sorted.at(-1)
      const start = top ? (top.maxAmount ?? top.minAmount) + 1 : 0
      return {
        ...w,
        bands: [
          ...w.bands,
          { id: `band-${Date.now()}`, minAmount: start, maxAmount: null, finalStageKey: w.stages.at(-1)?.key ?? "" },
        ],
      }
    })

  const save = () => {
    if (!draft) return
    publish.mutate(draft, {
      onSuccess: (p) => {
        toast.success(`${p.name} version ${p.version} published`)
        setDraft(null)
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ToneBadge tone={editing ? "warning" : validation.valid ? "success" : "danger"} dot>
            {editing ? (dirty ? "Unpublished changes" : "Editing") : validation.valid ? "Published" : "Has errors"}
          </ToneBadge>
          <span>Version {definition.version}</span>
          <span aria-hidden>·</span>
          <span>
            Updated {formatDate(definition.updatedAt)} by{" "}
            {users?.find((u) => u.id === definition.updatedById)?.name ?? "—"}
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setDraft(null)} disabled={publish.isPending}>
                  <Undo2 aria-hidden /> Discard
                </Button>
                <Button onClick={save} disabled={!dirty || !validation.valid || publish.isPending}>
                  {publish.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                  Publish version {definition.version + 1}
                </Button>
              </>
            ) : (
              <Button onClick={() => setDraft(structuredClone(definition))}>
                <Pencil aria-hidden /> Edit workflow
              </Button>
            )}
          </div>
        )}
      </div>

      {validation.issues.length > 0 && (
        <div className="space-y-2">
          {validation.issues.map((i) => (
            <Alert key={i.path + i.message} variant={i.severity === "error" ? "destructive" : "default"}>
              <TriangleAlert aria-hidden />
              <AlertDescription>{i.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Stages</CardTitle>
            <CardDescription>
              {editing
                ? "Drag to reorder. Applications move through these in order until their amount band closes the chain."
                : "Applications move through these in order until their amount band closes the chain."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={d.stages.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-3">
                  {d.stages.map((s, i) => (
                    <StageRow
                      key={s.key}
                      index={i}
                      stage={s}
                      definition={d}
                      editing={editing}
                      issues={issuesFor(`stages.${i}`)}
                      onChange={(patch) => setStage(s.key, patch)}
                      onRemove={() => update((w) => ({ ...w, stages: w.stages.filter((x) => x.key !== s.key) }))}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
            {editing && (
              <Button variant="outline" className="w-full border-dashed" onClick={addStage}>
                <Plus aria-hidden /> Add stage
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Approval limits</CardTitle>
              <CardDescription>Which stage closes the chain for each loan amount</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">From (₦)</TableHead>
                    <TableHead>To (₦)</TableHead>
                    <TableHead className="pr-6">Closes at</TableHead>
                    {editing && (
                      <TableHead className="w-10 pr-4">
                        <span className="sr-only">Remove</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...d.bands]
                    .sort((a, b) => a.minAmount - b.minAmount)
                    .map((b) => {
                      const i = d.bands.findIndex((x) => x.id === b.id)
                      const bad = issuesFor(`bands.${i}`).some((x) => x.severity === "error")
                      return (
                        <TableRow key={b.id} className={cn(bad && "bg-destructive/5")}>
                          {editing ? (
                            <>
                              <TableCell className="pl-6">
                                <NairaInput
                                  aria-label="From amount"
                                  value={b.minAmount}
                                  onChange={(v) => setBand(b.id, { minAmount: v ?? 0 })}
                                />
                              </TableCell>
                              <TableCell>
                                <NairaInput
                                  aria-label="To amount"
                                  placeholder="No limit"
                                  value={b.maxAmount}
                                  onChange={(v) => setBand(b.id, { maxAmount: v })}
                                />
                              </TableCell>
                              <TableCell className="pr-6">
                                <Select
                                  value={b.finalStageKey}
                                  onValueChange={(v) => setBand(b.id, { finalStageKey: v })}
                                >
                                  <SelectTrigger className="h-8 w-full min-w-32" aria-label="Closing stage">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {d.stages.map((s) => (
                                      <SelectItem key={s.key} value={s.key}>
                                        {s.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="pr-4">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Remove band"
                                  onClick={() => update((w) => ({ ...w, bands: w.bands.filter((x) => x.id !== b.id) }))}
                                >
                                  <Trash2 aria-hidden />
                                </Button>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="tabular pl-6">{formatNaira(b.minAmount, "compact")}</TableCell>
                              <TableCell className="tabular">
                                {b.maxAmount === null ? "No limit" : formatNaira(b.maxAmount, "compact")}
                              </TableCell>
                              <TableCell className="pr-6">
                                {d.stages.find((s) => s.key === b.finalStageKey)?.name ?? "—"}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
              {editing && (
                <div className="px-6 pt-3">
                  <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addBand}>
                    <Plus aria-hidden /> Add band
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <RouteSimulator definition={d} />
        </div>
      </div>
    </div>
  )
}
