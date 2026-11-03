import { FolderOpen, Lock, RefreshCw, ServerCrash } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api/errors"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
  /** Compact variant for use inside cards and tables. */
  size?: "default" | "sm"
}

export function EmptyState({ title, description, icon, action, className, size = "default" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-16",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground [&_svg]:size-5">
        {icon ?? <FolderOpen aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this",
  className,
  size,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
  size?: "default" | "sm"
}) {
  return (
    <EmptyState
      size={size}
      className={className}
      icon={<ServerCrash aria-hidden />}
      title={title}
      description={errorMessage(error)}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden /> Try again
          </Button>
        )
      }
    />
  )
}

export function NoPermissionState({ description, className }: { description?: ReactNode; className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<Lock aria-hidden />}
      title="You don't have access to this"
      description={
        description ?? "Your role doesn't include permission for this page. Ask an administrator if you need access."
      }
    />
  )
}
