"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState, type ReactNode } from "react"
import { ErrorModalHost, showError } from "@/components/shared/error-modal"
import { PinConfirmHost } from "@/components/shared/pin-confirm"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { makeQueryClient } from "@/lib/query-client"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient({ onMutationError: showError }))
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" />
          <PinConfirmHost />
          <ErrorModalHost />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
