"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumbs } from "./breadcrumbs"
import { HEADER_ICON_BUTTON } from "./header-styles"
import { NotificationsBell } from "./notifications-bell"
import { ThemeToggle } from "./theme-toggle"
import { HeaderUser } from "./user-menu"

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[4.5rem] shrink-0 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 sm:px-6 lg:px-8">
      <SidebarTrigger className={`-ml-1 ${HEADER_ICON_BUTTON}`} />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <NotificationsBell />
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <HeaderUser />
      </div>
    </header>
  )
}
