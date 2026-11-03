"use client"

import { ChevronsUpDown, KeyRound, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { initials } from "@/lib/format/name"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { useReferenceData } from "@/features/admin/hooks/use-reference-data"
import { useSignOut } from "@/features/auth/hooks/use-auth-actions"
import { useSession } from "@/features/auth/hooks/use-session"
import { setIntent } from "@/lib/navigation/intent"
import { ROLE_LABELS } from "@/lib/rbac/roles"

function useUserBranch() {
  const { user } = useSession()
  const { data: ref } = useReferenceData()
  return { user, branch: ref?.branches.find((b) => b.id === user.branchId) }
}

/** The signed-in staff member, pinned to the bottom of the sidebar. */
export function SidebarUser() {
  const { user, branch } = useUserBranch()
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-lg px-3 hover:bg-sidebar-accent hover:text-white data-[state=open]:bg-sidebar-accent data-[state=open]:text-white"
              aria-label={`Account: ${user.name}`}
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-medium text-white">{user.name}</span>
                <span className="truncate text-[11px] text-sidebar-foreground/60">
                  {ROLE_LABELS[user.role]}
                  {branch && ` · ${branch.name}`}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <AccountMenuContent side={isMobile ? "top" : "right"} align="end" />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Avatar with name, role and branch in the header. Opens the same account menu. */
export function HeaderUser() {
  const { user, branch } = useUserBranch()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account: ${user.name}, ${ROLE_LABELS[user.role]}`}
          className="flex h-10 items-center gap-2.5 rounded-full bg-muted/70 p-1 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted sm:pr-4"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:grid">
            <span className="max-w-40 truncate text-[13px] font-semibold">{user.name}</span>
            <span className="max-w-40 truncate text-[11px] text-muted-foreground">
              {ROLE_LABELS[user.role]}
              {branch && ` · ${branch.name}`}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <AccountMenuContent side="bottom" align="end" />
    </DropdownMenu>
  )
}

function AccountMenuContent({ side, align }: { side: "top" | "right" | "bottom"; align: "start" | "end" }) {
  const { user, branch } = useUserBranch()
  const { theme, setTheme } = useTheme()
  const signOut = useSignOut()
  const router = useRouter()
  const openSettings = (section: string) => {
    setIntent("settingsSection", section)
    router.push("/settings")
  }

  return (
    <DropdownMenuContent side={side} align={align} sideOffset={8} className="w-64">
      <DropdownMenuLabel className="font-normal">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 px-2 py-1.5 text-xs">
        <dt className="text-muted-foreground">Role</dt>
        <dd className="text-right font-medium">{ROLE_LABELS[user.role]}</dd>
        <dt className="text-muted-foreground">Staff ID</dt>
        <dd className="text-right font-mono">{user.staffId}</dd>
        {branch && (
          <>
            <dt className="text-muted-foreground">Branch</dt>
            <dd className="text-right font-medium">{branch.name}</dd>
          </>
        )}
      </dl>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => openSettings("profile")}>
        <Settings aria-hidden /> Settings
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => openSettings("security")}>
        <KeyRound aria-hidden /> Change PIN
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Sun className="dark:hidden" aria-hidden />
          <Moon className="hidden dark:block" aria-hidden />
          Appearance
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <Sun aria-hidden /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon aria-hidden /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor aria-hidden /> System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => signOut.mutate()}>
        <LogOut aria-hidden /> Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
