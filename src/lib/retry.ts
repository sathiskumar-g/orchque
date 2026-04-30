/**
 * Retry utility with exponential backoff
 *
 * Used by auth proxy routes to retry Supabase calls when the network
 * is flaky (ISP routing issues, intermittent connectivity).
 *
 * IMPORTANT: Supabase auth methods (signInWithPassword, signUp, etc.) do NOT
 * throw on network failure — they return { data: null, error: AuthRetryableFetchError }.
 * Callers must check the returned error and throw it inside the retry callback
 * so retry logic can catch and retry it. Use `throwIfRetryable()` for this.
 *
 * Only retries on NETWORK errors (timeout, DNS, connection refused).
 * Does NOT retry on application errors (wrong password, user not found).
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

/**
 * Returns true if the error is a transient network error worth retrying.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as Record<string, unknown>;

  // Supabase AuthRetryableFetchError (returned in { error } — not thrown)
  if (e.name === "AuthRetryableFetchError") return true;
  if (e.__isAuthError && e.status === 0) return true;

  // AbortError from our AbortController timeouts
  if (e.name === "AbortError") return true;

  // Generic fetch failures — both browser and Node.js undici formats
  const msg = ((e.message as string) || "").toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("connect_timeout") ||
    msg.includes("abort") ||
    msg.includes("network") ||
    msg.includes("socket hang up")
  ) {
    return true;
  }

  // Check nested cause (TypeError: fetch failed { cause: ConnectTimeoutError })
  if (e.cause && isRetryableError(e.cause)) return true;

  return false;
}

/**
 * If the error is a retryable network error, throw it so withRetry can catch it.
 * If it's an application error (wrong password, etc.), return it untouched.
 *
 * @example
 * ```ts
 * const { data, error } = await withRetry(async () => {
 *   const result = await supabase.auth.signInWithPassword({ email, password });
 *   throwIfRetryable(result.error);
 *   return result;
 * });
 * ```
 */
export function throwIfRetryable(error: unknown): void {
  if (error && isRetryableError(error)) {
    throw error;
  }
}

/**
 * Execute an async function with retry + exponential backoff.
 *
 * @example
 * ```ts
 * const result = await withRetry(() => supabase.auth.signInWithPassword({ email, password }));
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 8000,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-network errors (wrong password, etc.)
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry after the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait with exponential backoff + small jitter
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}
