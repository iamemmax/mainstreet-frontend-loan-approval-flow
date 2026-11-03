/** Masks all but the last `visible` characters, e.g. BVN 22*******91. */
export function maskValue(value: string, { visibleStart = 2, visibleEnd = 2 } = {}): string {
  if (value.length <= visibleStart + visibleEnd) return "•".repeat(value.length)
  return (
    value.slice(0, visibleStart) +
    "•".repeat(value.length - visibleStart - visibleEnd) +
    value.slice(value.length - visibleEnd)
  )
}

export function maskPhone(phone: string): string {
  // +234 803 ••• 4521
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "")
  return `+234 ${local.slice(0, 3)} ••• ${local.slice(-4)}`
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "")
  return `+234 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}
