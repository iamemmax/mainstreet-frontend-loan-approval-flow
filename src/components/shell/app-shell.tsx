"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { NoPermissionState } from "@/components/shared/empty-state"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionProvider, useSession, useSessionQuery } from "@/features/auth/hooks/use-session"
import { setIntent } from "@/lib/navigation/intent"
import { canAny } from "@/lib/rbac/can"
import { requiredPermissionFor } from "@/lib/rbac/routes"
import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"

/**
 * The one app shell for every staff role. It is the client-side auth gate
 * (there is no server in mock mode); navigation adapts to the signed-in
 * role. With a real backend, middleware does the redirect and this becomes
 * a fallback.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSessionQuery()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isPending && !session) {
      // Come back here after signing in, without putting it in the URL.
      setIntent("afterSignIn", pathname)
      router.replace("/login")
    }
  }, [isPending, session, router, pathname])

  if (!session) return <ShellSkeleton />

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <Topbar />
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8"
          >
            <RouteGuard>{children}</RouteGuard>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  )
}

function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const session = useSession()
  const required = requiredPermissionFor(pathname)
  if (required && !canAny(session, required)) return <NoPermissionState className="py-24" />
  return children
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-svh" aria-busy="true" aria-label="Loading">
      <div className="hidden w-64 shrink-0 space-y-3 bg-sidebar p-3 md:block">
        <Skeleton className="h-10 w-full bg-white/10" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-white/10" />
        ))}
      </div>
      <div className="flex-1">
        <div className="flex h-[4.5rem] items-center gap-3 border-b bg-card px-8">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="ml-auto h-8 w-64" />
        </div>
        <div className="space-y-4 p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
