"use client"

import type { ReactNode } from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const STYLES = {
  /** Quiet switch inside a card or panel: muted track, raised active option. */
  muted: {
    root: "inline-flex rounded-lg bg-muted p-0.5",
    item: "rounded-md px-3 py-1 text-xs data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs",
  },
  /** Prominent views above a list: the active option is filled. */
  primary: {
    root: "flex gap-1 overflow-x-auto",
    item: "shrink-0 rounded-lg px-3 py-1.5 text-[13px] whitespace-nowrap hover:bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-xs",
  },
}

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  "aria-label": string
  variant?: keyof typeof STYLES
  className?: string
}

/** Pick one of a few views. Arrow keys move between options; one is always selected. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "muted",
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const s = STYLES[variant]
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      // Clicking the selected option would clear it; keep one selected.
      onValueChange={(v) => v && onChange(v as T)}
      className={cn(s.root, className)}
      {...aria}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className={cn(
            "font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:hover:text-current",
            s.item,
          )}
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
