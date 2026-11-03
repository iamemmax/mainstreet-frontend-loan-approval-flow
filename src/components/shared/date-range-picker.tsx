"use client"

import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  subDays,
} from "date-fns"
import { useState, type ReactNode } from "react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { FilterChip } from "./filter-chip"

export type { DateRange }

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  /** Chip label, e.g. "Created". */
  label?: string
  icon?: ReactNode
}

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last 7 days", range: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 30 days", range: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "This month", range: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "This quarter", range: () => ({ from: startOfQuarter(new Date()), to: endOfDay(new Date()) }) },
]

function describe(range: DateRange | undefined) {
  if (!range?.from) return null
  if (!range.to) return format(range.from, "d MMM yyyy")
  return `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`
}

export function DateRangePicker({ value, onChange, label = "Date", icon }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const text = describe(value) ?? undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterChip label={label} icon={icon} value={text} onClear={() => onChange(undefined)} />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-2xl p-0 shadow-[0_16px_40px_-12px_rgb(16_24_40/0.25)]"
        align="start"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-2.5 sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
            <div className="hidden px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:block">
              Quick ranges
            </div>
            {PRESETS.map((p) => {
              const range = p.range()
              const on =
                !!value?.from && !!value.to && isSameDay(value.from, range.from!) && isSameDay(value.to, range.to!)
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange(range)
                    setOpen(false)
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on
                      ? "bg-primary/[0.09] font-medium text-primary"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <Calendar
            mode="range"
            numberOfMonths={isMobile ? 1 : 2}
            // With two months side by side, overflow days would show the range twice.
            showOutsideDays={false}
            selected={value}
            defaultMonth={value?.from ?? subDays(new Date(), 30)}
            onSelect={(r) => onChange(r?.to ? { from: r.from, to: endOfDay(r.to) } : r)}
            disabled={{ after: new Date() }}
            className="bg-transparent"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5">
          <span className="text-[13px]">
            {value?.from ? (
              <>
                <span className="font-medium">{describe(value)}</span>
                {value.to && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {differenceInCalendarDays(value.to, value.from) + 1} days
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Pick a start and an end date</span>
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={!value?.from} onClick={() => onChange(undefined)}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
