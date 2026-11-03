"use client"

import { MoreHorizontal, Search, UserPlus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { initials } from "@/lib/format/name"
import { ErrorState, EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MODAL_CONTENT, ModalBody, ModalFooter, ModalHeader } from "@/components/shared/modal"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSession } from "@/features/auth/hooks/use-session"
import { ROLE_LABELS, ROLES, type Role } from "@/lib/rbac/roles"
import { useReferenceData, useUpdateUserStatus, useUsers } from "../hooks/use-reference-data"
import { BRAND } from "@/lib/brand"
import { AdminPage } from "./admin-page"

const STATUS = {
  active: { tone: "success", label: "Active" },
  away: { tone: "info", label: "Away" },
  inactive: { tone: "neutral", label: "Deactivated" },
} as const

export function UsersAdmin() {
  const { user: me } = useSession()
  const { data: users, isPending, error, refetch } = useUsers()
  const { data: ref } = useReferenceData()
  const update = useUpdateUserStatus()
  const [q, setQ] = useState("")
  const [role, setRole] = useState<Role | "all">("all")

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (users ?? []).filter(
      (u) =>
        (role === "all" || u.role === role) &&
        (!needle || `${u.name} ${u.email} ${u.staffId}`.toLowerCase().includes(needle)),
    )
  }, [users, q, role])

  return (
    <AdminPage title="Users" description="Staff accounts, their roles and branches." actions={<InviteDialog />}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or staff ID"
            aria-label="Search users"
            className="h-9 pl-8"
          />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role | "all")}>
          <SelectTrigger className="h-9 sm:w-56" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} size="sm" />
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState size="sm" title="No users match" />
        ) : (
          <Table aria-label="Users">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Branch</TableHead>
                <TableHead className="hidden sm:table-cell">Staff ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 px-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium">
                          {u.name}
                          {u.id === me.id && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{ROLE_LABELS[u.role]}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {ref?.branches.find((b) => b.id === u.branchId)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">{u.staffId}</TableCell>
                  <TableCell>
                    <ToneBadge tone={STATUS[u.status].tone} dot>
                      {STATUS[u.status].label}
                    </ToneBadge>
                  </TableCell>
                  <TableCell className="px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${u.name}`}
                          disabled={u.id === me.id}
                        >
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => toast.success(`Password reset link sent to ${u.email}`)}>
                          Send password reset
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant={u.status === "inactive" ? "default" : "destructive"}
                          onSelect={() =>
                            update.mutate(
                              { id: u.id, status: u.status === "inactive" ? "active" : "inactive" },
                              {
                                onSuccess: (x) =>
                                  toast.success(`${x.name} ${x.status === "inactive" ? "deactivated" : "reactivated"}`),
                              },
                            )
                          }
                        >
                          {u.status === "inactive" ? "Reactivate" : "Deactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminPage>
  )
}

function InviteDialog() {
  const { data: ref } = useReferenceData()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden /> Invite user
        </Button>
      </DialogTrigger>
      <DialogContent className={MODAL_CONTENT}>
        <ModalHeader
          icon={UserPlus}
          title="Invite a staff member"
          description="They'll get an email to set their password. Access follows the role you choose."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            toast.success(`Invitation sent to ${email}`)
            setOpen(false)
            setEmail("")
          }}
        >
          <ModalBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-name">Full name</Label>
              <Input id="inv-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">Work email</Label>
              <Input
                id="inv-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`name@${BRAND.staffEmailDomain}`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select defaultValue="relationship_officer">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select defaultValue={ref?.branches[0]?.id}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ref?.branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Send invitation</Button>
          </ModalFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
