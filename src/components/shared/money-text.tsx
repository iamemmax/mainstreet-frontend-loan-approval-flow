import { formatNaira, type Kobo, type MoneyFormat } from "@/lib/format/money"
import { cn } from "@/lib/utils"

interface MoneyTextProps {
  /** Integer kobo. */
  value: Kobo
  format?: MoneyFormat
  className?: string
}

/** The only way money is rendered: tabular figures, full value on hover. */
export function MoneyText({ value, format = "whole", className }: MoneyTextProps) {
  return (
    <span
      className={cn("tabular whitespace-nowrap", className)}
      title={format === "full" ? undefined : formatNaira(value, "full")}
    >
      {formatNaira(value, format)}
    </span>
  )
}
