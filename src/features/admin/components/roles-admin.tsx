"use client"

import { Loader2, RotateCcw, Save } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ErrorState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { PERMISSIONS, type Permission } from "@/lib/rbac/permissions"
import { ROLE_LABELS, ROLES, type Role } from "@/lib/rbac/roles"
import { cn } from "@/lib/utils"
import { useRolePermissions, useSaveRolePermissions } from "../hooks/use-reference-data"
import { AdminPage } from "./admin-page"
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/rbac/labels"

export function RolesAdmin() {
  const { data, isPending, error, refetch } = useRolePermissions()
  const save = useSaveRolePermissions()
  const [draft, setDraft] = useState<Record<Role, Permission[]> | null>(null)
  useEffect(() => {
    if (data) setDraft(structuredClone(data) as Record<Role, Permission[]>)
  }, [data])

  const dirty = ROLES.filter((r) => draft && data && [...draft[r]].sort().join() !== [...(data[r] ?? [])].sort().join())
  const toggle = (role: Role, p: Permission) =>
    setDraft((d) => d && { ...d, [role]: d[role].includes(p) ? d[role].filter((x) => x !== p) : [...d[role], p] })

  const saveAll = async () => {
    if (!draft) return
    try {
      for (const role of dirty) await save.mutateAsync({ role, permissions: draft[role] })
      toast.success(`Saved permissions for ${dirty.length} role${dirty.length === 1 ? "" : "s"}`)
    } catch {
      // The error modal explains what went wrong.
    }
  }

  return (
    <AdminPage
      title="Roles & permissions"
      description="What each role can see and do. Changes apply on the user's next action."
      actions={
        <>
          <Button
            variant="outline"
            disabled={!dirty.length || save.isPending}
            onClick={() => data && setDraft(structuredClone(data) as Record<Role, Permission[]>)}
          >
            <RotateCcw aria-hidden /> Discard
          </Button>
          <Button disabled={!dirty.length || save.isPending} onClick={saveAll}>
            {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Save changes{dirty.length ? ` (${dirty.length})` : ""}
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending || !draft ? (
        <Skeleton className="h-[32rem] w-full" />
      ) : (
        <div className="overflow-auto rounded-xl border bg-card">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Permission
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    className={cn(
                      "px-2 py-3 text-center text-xs font-medium",
                      dirty.includes(r) ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span className="block w-20 text-balance">{ROLE_LABELS[r]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((g) => {
                const perms = PERMISSIONS.filter((p) => new RegExp(`^(${g.prefix})`).test(p))
                return [
                  <tr key={g.label} className="bg-muted/40">
                    <th colSpan={ROLES.length + 1} className="sticky left-0 px-4 py-2 text-left text-xs font-semibold">
                      {g.label}
                    </th>
                  </tr>,
                  ...perms.map((p) => (
                    <tr key={p} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="sticky left-0 bg-card px-4 py-2">
                        <div className="font-medium">{PERMISSION_LABELS[p]}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{p}</div>
                      </td>
                      {ROLES.map((r) => (
                        <td key={r} className="px-2 py-2 text-center">
                          <Checkbox
                            checked={draft[r].includes(p)}
                            onCheckedChange={() => toggle(r, p)}
                            aria-label={`${ROLE_LABELS[r]}: ${PERMISSION_LABELS[p]}`}
                          />
                        </td>
                      ))}
                    </tr>
                  )),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  )
}
