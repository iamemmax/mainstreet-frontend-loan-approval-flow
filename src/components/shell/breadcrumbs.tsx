"use client"

import { House } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useApplication } from "@/features/applications/hooks/use-applications"
import { useVisibleNav } from "./use-nav"

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Administration",
  new: "New application",
}

function labelFor(items: { href: string; title: string }[], href: string, segment: string) {
  return (
    items.find((i) => i.href === href)?.title ?? SEGMENT_LABELS[segment] ?? decodeURIComponent(segment).toUpperCase()
  )
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const items = useVisibleNav().flatMap((g) => g.items)
  const segments = pathname.split("/").filter(Boolean)
  // An application page shows its loan reference, already cached by the page itself.
  const appId = segments[0] === "applications" && segments[1] && segments[1] !== "new" ? segments[1] : ""
  const { data: app } = useApplication(appId)
  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    return { href, label: seg === appId && app ? app.reference : labelFor(items, href, seg) }
  })

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap text-[13px]">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild>
            <Link href="/dashboard" aria-label="Dashboard" className="text-muted-foreground hover:text-foreground">
              <House className="size-4" aria-hidden />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden sm:inline-flex" : "min-w-0"}>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage className="truncate font-semibold">{c.label}</BreadcrumbPage>
              ) : !items.some((it) => it.href === c.href) ? (
                // Grouping segments such as /admin have no page of their own.
                <span className="text-muted-foreground">{c.label}</span>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={c.href}>{c.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
