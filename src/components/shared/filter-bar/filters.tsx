"use client"

import { Banknote, CalendarDays, Check, Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { NumberInput } from "../number-input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatNaira, koboToNaira, nairaToKobo } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { DateRangePicker } from "../date-range-picker"
import { FilterChip } from "../filter-chip"
import type { FilterDef, FilterState } from "./state"

export function SearchFilter({ def, state }: { def: Extract<FilterDef, { type: "search" }>; state: FilterState }) {
  const urlValue = state.str(def.key) ?? ""
  const [text, setText] = useState(urlValue)
  const debounced = useDebouncedValue(text, 300)

  useEffect(() => setText(urlValue), [urlValue])
  useEffect(() => {
    if (debounced !== urlValue) state.set({ [def.key]: debounced || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced])

  // "/" jumps to the search box from anywhere on the page, unless you're already typing.
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName))
      if (e.key === "/" && !typing) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="relative w-full xl:w-80">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {!text && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground"
        >
          /
        </kbd>
      )}
      <Input
        ref={input}
        type="text"
        inputMode="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={def.placeholder}
        aria-label={def.placeholder}
        className="h-9 rounded-lg pr-8 pl-9 text-[13px]"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

export function FacetedFilter({ def, state }: { def: Extract<FilterDef, { type: "faceted" }>; state: FilterState }) {
  const selected = new Set(state.list(def.key) ?? [])
  const toggle = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    state.set({ [def.key]: next.size ? [...next].join(",") : null })
  }
  const summary =
    selected.size === 0
      ? undefined
      : selected.size === 1
        ? (def.options.find((o) => selected.has(o.value))?.label ?? "1 selected")
        : `${selected.size} selected`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterChip
          label={def.label}
          icon={def.icon ? <def.icon aria-hidden /> : undefined}
          value={summary}
          onClear={() => state.set({ [def.key]: null })}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${def.label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {def.options.map((o) => {
                const isOn = selected.has(o.value)
                return (
                  <CommandItem
                    key={o.value}
                    onSelect={() => toggle(o.value)}
                    aria-checked={isOn}
                    role="menuitemcheckbox"
                    className="gap-2.5"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        isOn ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {isOn && <Check className="size-3" aria-hidden />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => state.set({ [def.key]: null })}
                    className="justify-center text-muted-foreground"
                  >
                    Clear selection
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function DateFilter({ def, state }: { def: Extract<FilterDef, { type: "dateRange" }>; state: FilterState }) {
  const from = state.str(def.fromKey)
  const to = state.str(def.toKey)
  return (
    <DateRangePicker
      label={def.label}
      icon={<CalendarDays aria-hidden />}
      value={from ? { from: new Date(from), to: to ? new Date(to) : undefined } : undefined}
      onChange={(r) =>
        state.set({ [def.fromKey]: r?.from?.toISOString() ?? null, [def.toKey]: r?.to?.toISOString() ?? null })
      }
    />
  )
}

export function AmountFilter({ def, state }: { def: Extract<FilterDef, { type: "amountRange" }>; state: FilterState }) {
  const min = state.num(def.minKey)
  const max = state.num(def.maxKey)
  const [draft, setDraft] = useState({ min: "", max: "" })
  const [open, setOpen] = useState(false)
  const active = min !== undefined || max !== undefined
  const invalid = draft.min !== "" && draft.max !== "" && Number(draft.min) > Number(draft.max)

  const summary = active
    ? min !== undefined && max !== undefined
      ? `${formatNaira(min, "compact")} – ${formatNaira(max, "compact")}`
      : min !== undefined
        ? `≥ ${formatNaira(min, "compact")}`
        : `≤ ${formatNaira(max!, "compact")}`
    : undefined

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o)
          setDraft({
            min: min !== undefined ? String(koboToNaira(min)) : "",
            max: max !== undefined ? String(koboToNaira(max)) : "",
          })
      }}
    >
      <PopoverTrigger asChild>
        <FilterChip
          label={def.label}
          icon={<Banknote aria-hidden />}
          value={summary}
          onClear={() => state.set({ [def.minKey]: null, [def.maxKey]: null })}
        />
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (invalid) return
            state.set({
              [def.minKey]: draft.min ? String(nairaToKobo(Number(draft.min))) : null,
              [def.maxKey]: draft.max ? String(nairaToKobo(Number(draft.max))) : null,
            })
            setOpen(false)
          }}
        >
          <p className="text-sm font-medium">Loan amount</p>
          <div className="grid grid-cols-2 gap-2">
            {(["min", "max"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`${def.minKey}-${k}`} className="text-xs text-muted-foreground">
                  {k === "min" ? "From (₦)" : "To (₦)"}
                </Label>
                <NumberInput
                  id={`${def.minKey}-${k}`}
                  className="h-9"
                  placeholder={k === "min" ? "0" : "No limit"}
                  value={draft[k]}
                  onValueChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
                  aria-invalid={invalid}
                />
              </div>
            ))}
          </div>
          {invalid && <p className="text-xs text-destructive">The lower amount must be below the upper amount.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={invalid}>
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
