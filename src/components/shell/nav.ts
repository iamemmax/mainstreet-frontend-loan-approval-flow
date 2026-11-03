import {
  Building2,
  ChartColumn,
  FilePlus,
  FileText,
  Inbox,
  LayoutDashboard,
  Landmark,
  Package,
  Plug,
  ScrollText,
  ShieldCheck,
  Bell,
  FileCode,
  Users,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/lib/rbac/permissions"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Any one of these shows the item. */
  permission: Permission | Permission[]
  /** Shown in the command palette to help search. */
  keywords?: string[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Navigation is filtered by permission; the same permissions guard the routes. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "application:view",
        keywords: ["home", "overview", "pipeline"],
      },
    ],
  },
  {
    label: "Work",
    items: [
      {
        title: "My work",
        href: "/my-work",
        icon: Inbox,
        permission: "approval:act",
        keywords: ["approvals", "queue", "pending"],
      },
      {
        title: "Applications",
        href: "/applications",
        icon: FileText,
        permission: "application:view",
        keywords: ["loans", "pipeline"],
      },
      {
        title: "New application",
        href: "/applications/new",
        icon: FilePlus,
        permission: "application:create",
        keywords: ["create", "intake"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Finance handover",
        href: "/handover",
        icon: Landmark,
        permission: "handover:view",
        keywords: ["disbursement", "accepted"],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: ChartColumn,
        permission: "reports:view",
        keywords: ["dashboard", "analytics"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Users", href: "/admin/users", icon: Users, permission: "admin:users" },
      {
        title: "Roles & permissions",
        href: "/admin/roles",
        icon: ShieldCheck,
        permission: "admin:users",
        keywords: ["rbac", "matrix"],
      },
      { title: "Branches & regions", href: "/admin/branches", icon: Building2, permission: "admin:branches" },
      {
        title: "Products",
        href: "/admin/products",
        icon: Package,
        permission: "admin:products",
        keywords: ["rates", "fees", "tenor"],
      },
      {
        title: "Workflow builder",
        href: "/admin/workflows",
        icon: Workflow,
        permission: "admin:workflow",
        keywords: ["stages", "limits", "sla"],
      },
      {
        title: "Templates",
        href: "/admin/templates",
        icon: FileCode,
        permission: "admin:templates",
        keywords: ["offer letter"],
      },
      {
        title: "Notification settings",
        href: "/admin/notifications",
        icon: Bell,
        permission: "admin:notifications",
        keywords: ["sms", "email"],
      },
      { title: "Audit log", href: "/admin/audit", icon: ScrollText, permission: "audit:view" },
      {
        title: "Integrations",
        href: "/admin/integrations",
        icon: Plug,
        permission: "admin:integrations",
        keywords: ["prembly", "bureau", "yournotify"],
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "application:view",
        keywords: ["pin", "profile", "delegation", "out of office", "theme", "notifications"],
      },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
