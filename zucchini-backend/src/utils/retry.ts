/**
 * Generic retry helpers for transient failures (Shopify Admin API, DB blips).
 */

export type RetryOptions = {
  /** Max attempts including the first try. Default 3. */
  attempts?: number;
  /** Base delay in ms before first retry. Default 200. */
  baseDelayMs?: number;
  /** Max delay cap in ms. Default 4000. */
  maxDelayMs?: number;
  /** Optional label for logs. */
  label?: string;
  /** Return true to retry this error; default retries most 5xx / network errors. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(err: unknown): boolean {
  if (!err) return false;
  const e = err as any;

  // Explicit non-retryable business errors
  if (e instanceof Error && (e as any).status && (e as any).status < 500 && (e as any).status >= 400) {
    // ApiError with 4xx — do not retry
    if ((e as any).status !== 429) return false;
  }

  const msg = String(e?.message || e || "").toLowerCase();
  const code = e?.code || e?.errno || "";

  // Network / transient
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "P1001" || // Prisma: can't reach DB
    code === "P1002" ||
    code === "P1017" ||
    code === "P2024"
  ) {
    return true;
  }

  if (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("socket") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("429") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  ) {
    return true;
  }

  // HTTP-style status on error object
  const status = e?.status ?? e?.statusCode;
  if (typeof status === "number" && (status === 429 || status >= 500)) return true;

  return false;
}

/**
 * Exponential backoff with jitter: base * 2^(attempt-1) ± 20%, capped at maxDelayMs.
 */
export function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = exp * (0.8 + Math.random() * 0.4);
  return Math.round(Math.min(maxDelayMs, jitter));
}

/**
 * Run `fn` with retries on transient failures.
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const maxDelayMs = opts.maxDelayMs ?? 4000;
  const shouldRetry = opts.shouldRetry ?? ((err) => defaultShouldRetry(err));
  const label = opts.label || "operation";

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const retry = attempt < attempts && shouldRetry(err, attempt);
      if (!retry) throw err;
      const delay = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(`[retry] ${label} attempt ${attempt}/${attempts} failed; retrying in ${delay}ms`, {
        err: (err as any)?.message || String(err),
      });
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Classify whether a webhook handler should ask Shopify to retry (5xx)
 * or acknowledge permanently (2xx / 4xx).
 *
 * Shopify retries non-2xx responses several times over ~4 hours, then may
 * delete Admin-API-registered subscriptions after consecutive failures.
 */
export function isTransientWebhookError(err: unknown): boolean {
  return defaultShouldRetry(err);
}
