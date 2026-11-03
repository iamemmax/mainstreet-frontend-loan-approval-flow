import { cn } from "@/lib/utils"

/** Decorative sparkles and confetti around the status icon. Purely visual. */
export function Burst({ className }: { className?: string }) {
  const sparkle = (x: number, y: number, r: number) =>
    `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`
  return (
    <svg
      viewBox="0 0 320 220"
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 top-0 mx-auto h-[220px] w-[320px]", className)}
    >
      <g className="fill-muted-foreground/35">
        <path d={sparkle(36, 54, 9)} />
        <path d={sparkle(282, 108, 9)} />
        <circle cx="152" cy="20" r="2.5" />
        <circle cx="284" cy="170" r="3.5" />
      </g>
      <g className="stroke-muted-foreground/30" strokeWidth="1.6" strokeLinecap="round">
        <path d="M244 14v12M238 20h12M240 16l8 8M248 16l-8 8" />
        <path d="M16 110v10M11 115h10M12 111l8 8M20 111l-8 8" />
      </g>
      <g className="fill-current" opacity="0.75">
        <circle cx="82" cy="88" r="3.5" />
        <circle cx="254" cy="140" r="3" />
        <circle cx="40" cy="186" r="2.5" />
        <path d="M262 30l4 7h-8z" />
        <path d="M100 140l3.5 6h-7z" opacity="0.5" />
        <path d={sparkle(292, 42, 7)} />
      </g>
      <g className="stroke-current" strokeWidth="4" strokeLinecap="round" opacity="0.6">
        <path d="M128 50l9-5" />
        <path d="M246 74l9 5" />
        <path d="M62 132l3 8" />
        <path d="M262 112l-5 7" />
      </g>
    </svg>
  )
}
