import { MutationCache, QueryClient } from "@tanstack/react-query"
import { isApiError } from "./api/errors"

/** Errors a form already shows next to the field, so they never open the error modal. */
const INLINE_CODES = new Set(["invalid_pin", "invalid_password"])

/**
 * Every failed mutation is reported through `onMutationError` (the error modal),
 * unless the mutation sets `meta: { inlineErrors: true }` to show it itself.
 */
export function makeQueryClient({ onMutationError }: { onMutationError?: (error: unknown) => void } = {}) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.inlineErrors) return
        if (isApiError(error) && INLINE_CODES.has(error.code)) return
        onMutationError?.(error)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Client errors (4xx) will not fix themselves on retry.
        retry: (count, error) => !(isApiError(error) && error.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}
