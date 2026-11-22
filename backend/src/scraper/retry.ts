export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const jitter = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));

export interface RetryOptions {
  attempts: number;
  baseMs: number;
  label: string;
  onRetry?: (err: Error, attempt: number, waitMs: number) => void;
}

/** Retries `fn` with exponential backoff + jitter. Rethrows the last error. */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions): Promise<T> {
  let lastErr: Error = new Error('unknown');
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e as Error;
      if (attempt === opts.attempts) break;
      const wait = opts.baseMs * 2 ** (attempt - 1) + jitter(0, 500);
      opts.onRetry?.(lastErr, attempt, wait);
      await sleep(wait);
    }
  }
  throw new Error(`${opts.label} failed after ${opts.attempts} attempts: ${lastErr.message}`);
}
