import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { initials } from "@/lib/format/name"
import { ROLE_LABELS } from "@/lib/rbac/roles"
import type { User } from "../../types"

/** The account being signed in to, with a way back to choose another. */
export function AccountChip({ user, onChange }: { user: User; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-xs">
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {ROLE_LABELS[user.role]} · {user.email}
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onChange}>
        Change
      </Button>
    </div>
  )
}
