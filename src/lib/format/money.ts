/**
 * Money is always stored and transported as integer kobo (minor units).
 * This is the only place that converts kobo into display strings.
 */
export type Kobo = number

const KOBO_PER_NAIRA = 100

const full = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const whole = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
})

const compact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  notation: "compact",
  maximumFractionDigits: 1,
})

export type MoneyFormat = "full" | "whole" | "compact"

export function formatNaira(kobo: Kobo, format: MoneyFormat = "whole"): string {
  const naira = kobo / KOBO_PER_NAIRA
  if (format === "compact") return compact.format(naira)
  if (format === "full") return full.format(naira)
  return whole.format(naira)
}

export function nairaToKobo(naira: number): Kobo {
  return Math.round(naira * KOBO_PER_NAIRA)
}

export function koboToNaira(kobo: Kobo): number {
  return kobo / KOBO_PER_NAIRA
}

/** Groups a string of digits in thousands as typed: "1500000" → "1,500,000". Works past Number precision. */
export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const count = new Intl.NumberFormat("en-NG")
export function formatCount(n: number): string {
  return count.format(n)
}

/** "1 loan", "3 loans"; pass `many` for irregular forms ("1 offer expires" / "2 offers expire"). */
export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${count.format(n)} ${n === 1 ? one : many}`
}

export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("en-NG", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio)
}
