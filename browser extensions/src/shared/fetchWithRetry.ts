/**
 * Shared fetch wrapper with transient-error retry.
 *
 * Handles two failure modes:
 *   1. Transient network errors (TypeError: Failed to fetch) → retry with backoff
 *   2. HTTP 401 → caller refreshes token and retries
 *
 * Used by all background handlers to avoid dropped requests on flaky connections.
 */

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 300;

/**
 * Execute a fetch, retrying once on transient network errors.
 * HTTP errors (4xx, 5xx) are NOT retried — they are returned to the caller.
 */
export async function fetchWithRetry(
  fn: () => Promise<Response>,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= maxRetries) throw e;
      // Only retry network errors, not runtime exceptions
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}
