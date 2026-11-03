/** Semantic tones. Colour is only ever used to carry status or risk. */
export type Tone = "neutral" | "info" | "accent" | "warning" | "success" | "danger"

export const TONE_BADGE: Record<Tone, string> = {
  neutral: "border-transparent bg-muted text-muted-foreground",
  info: "border-transparent bg-info/10 text-info",
  accent: "border-transparent bg-primary/[0.08] text-primary",
  warning: "border-transparent bg-warning/12 text-warning",
  success: "border-transparent bg-success/10 text-success",
  danger: "border-transparent bg-destructive/10 text-destructive",
}

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-info",
  accent: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-destructive",
}

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-info",
  accent: "text-primary",
  warning: "text-warning",
  success: "text-success",
  danger: "text-destructive",
}

/** Tinted square behind an icon, e.g. in alert lists and check results. */
export const TONE_TILE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  accent: "bg-primary/10 text-primary",
  warning: "bg-warning/12 text-warning",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
}
