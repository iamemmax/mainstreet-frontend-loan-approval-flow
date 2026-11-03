export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}
