import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base leading-relaxed shadow-xs transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        "hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:focus-visible:ring-destructive/10",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
