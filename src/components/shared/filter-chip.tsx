"use client"

import { ChevronDown, X } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FilterChipProps extends Omit<ComponentProps<"button">, "children" | "value"> {
  label: string
  /** What's selected, e.g. "Pending Approval" or "3 selected". Empty means the filter is off. */
  value?: ReactNode
  icon?: ReactNode
  onClear?: () => void
}

/**
 * Trigger for a table filter. Off: a quiet outlined chip. On: tinted, showing
 * the selection, with its own clear button. Use as a Popover trigger child.
 */
export function FilterChip({ label, value, icon, onClear, className, ...button }: FilterChipProps) {
  const active = value !== undefined && value !== null && value !== ""
  return (
    <span
      className={cn(
        "inline-flex h-9 items-stretch overflow-hidden rounded-lg border text-[13px] shadow-xs transition-colors has-[[data-state=open]]:border-primary/40 has-[[data-state=open]]:ring-4 has-[[data-state=open]]:ring-primary/10",
        active ? "border-primary/25 bg-primary/[0.06]" : "border-border bg-card hover:border-foreground/25",
        className,
      )}
    >
      <button
        type="button"
        {...button}
        className="inline-flex items-center gap-1.5 px-3 font-medium text-foreground/75 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=open]:text-foreground [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
      >
        {icon}
        <span className={cn(active && "text-foreground")}>{label}</span>
        {active && (
          <>
            <span aria-hidden className="h-3.5 w-px bg-primary/25" />
            <span className="max-w-44 truncate font-semibold text-primary">{value}</span>
          </>
        )}
        {!active && <ChevronDown className="opacity-60" aria-hidden />}
      </button>
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label} filter`}
          className="inline-flex items-center border-l border-primary/15 pr-3 pl-2 text-primary/70 outline-none hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}
