/** Deterministic PRNG (mulberry32) so the seed data is identical on every boot. */
export function createRandom(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min

  return {
    next,
    int,
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    digits: (n: number) => Array.from({ length: n }, () => int(0, 9)).join(""),
    /** Log-uniform between min and max, rounded to `step` — realistic loan amounts. */
    amount: (min: number, max: number, step: number) => {
      const v = Math.exp(Math.log(min) + next() * (Math.log(max) - Math.log(min)))
      return Math.max(min, Math.min(max, Math.round(v / step) * step))
    },
    weighted: <T extends string>(weights: Readonly<Record<T, number>>): T => {
      const entries = Object.entries(weights) as [T, number][]
      const total = entries.reduce((s, [, w]) => s + w, 0)
      let r = next() * total
      for (const [k, w] of entries) {
        r -= w
        if (r <= 0) return k
      }
      return entries[entries.length - 1][0]
    },
  }
}

export type Random = ReturnType<typeof createRandom>
