import { initials } from "@/lib/format/name"
import { cn } from "@/lib/utils"

/** Soft tinted backgrounds, picked from the name so a person always gets the same one. */
const TONES = [
  "bg-primary/10 text-primary",
  "bg-info/10 text-info",
  "bg-success/10 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/10 text-destructive",
  "bg-chart-2/15 text-chart-2",
] as const

export function toneFor(seed: string, tones: readonly string[] = TONES) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return tones[h % tones.length]
}

export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        toneFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
