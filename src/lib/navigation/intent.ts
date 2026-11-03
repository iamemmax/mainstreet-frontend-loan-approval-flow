/**
 * Hands state to the next screen without putting it in the URL. A link sets
 * an intent just before navigating; the destination takes it once on mount.
 * Lives in memory, so a reload simply starts from the screen's defaults.
 */
export interface ListIntent {
  filters?: Record<string, string>
  sort?: string
  dir?: "asc" | "desc"
}

export interface Intents {
  applications: ListIntent
  /** Tab to open on the application page. */
  applicationTab: string
  /** Where to go after signing in. */
  afterSignIn: string
  /** Section to open on the settings page. */
  settingsSection: string
}

const pending: Partial<Intents> = {}

export function setIntent<K extends keyof Intents>(key: K, value: Intents[K]) {
  pending[key] = value
}

/**
 * Returns the intent and clears it after the current task, so it applies once.
 * Clearing is deferred because React may run a state initialiser twice.
 */
export function takeIntent<K extends keyof Intents>(key: K): Intents[K] | undefined {
  const value = pending[key]
  if (value !== undefined) {
    queueMicrotask(() => {
      if (pending[key] === value) delete pending[key]
    })
  }
  return value
}
