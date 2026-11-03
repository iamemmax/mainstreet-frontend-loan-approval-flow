import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-1 text-base shadow-xs transition-[color,border-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 md:text-sm dark:bg-input/30",
        "disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:shadow-none read-only:bg-muted/40",
        "hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10",
        "aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:focus-visible:ring-destructive/10 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
