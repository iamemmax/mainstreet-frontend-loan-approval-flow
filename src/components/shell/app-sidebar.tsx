"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"
import { ALL_NAV_ITEMS } from "./nav"
import { isActivePath, useNavCounts, useVisibleNav } from "./use-nav"
import { SidebarUser } from "./user-menu"
import MainStreetLogo from "@/app/icons/Logo"

const ALL_HREFS = ALL_NAV_ITEMS.map((i) => i.href)

/** The Mainstreet mark: a rounded tile with a stylised M. */
/** The Mainstreet shield. Decorative: the bank's name always sits next to it. */
export function BrandMark({ className }: { className?: string }) {
  return <MainStreetLogo aria-hidden className={cn("h-9 w-auto shrink-0", className)} />
}

export function AppSidebar() {
  const pathname = usePathname()
  const groups = useVisibleNav()
  const counts = useNavCounts()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-[4.5rem] justify-center border-b border-sidebar-border px-5 group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          className="flex items-center gap-3.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label={`${BRAND.bankShortName} ${BRAND.productName} home`}
        >
          <BrandMark />
          <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight text-white">{BRAND.bankShortName}</span>
            <span className="truncate text-[11px] font-medium tracking-wide text-sidebar-foreground/60 uppercase">
              {BRAND.productName}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 py-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="h-7 px-3 text-[11px] font-semibold tracking-[0.08em] text-sidebar-foreground/45 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href, ALL_HREFS)
                  const count = counts[item.href]
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "relative h-10 gap-3.5 rounded-lg px-3.5 text-[13px] font-medium text-sidebar-foreground/75 transition-colors",
                          "hover:bg-sidebar-accent hover:text-white",
                          "data-[active=true]:bg-white/[0.09] data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-white/10 data-[active=true]:[&>svg]:text-sidebar-primary",
                          "[&>svg]:size-[18px]",
                        )}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpenMobile(false)}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-sidebar-primary group-data-[collapsible=icon]:hidden"
                            />
                          )}
                          <item.icon aria-hidden />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {count && count.value > 0 && (
                        <SidebarMenuBadge
                          className={cn(
                            "top-2.5! right-2.5 h-5 rounded-full px-1.5 text-[11px] font-semibold",
                            count.urgent ? "bg-destructive text-white" : "bg-sidebar-primary/15 text-sidebar-primary",
                          )}
                          aria-label={count.label}
                        >
                          {count.value > 99 ? "99+" : count.value}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
