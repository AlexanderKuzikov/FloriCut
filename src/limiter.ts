import Bottleneck from 'bottleneck';
import { Config } from './types.js';
import { logger } from './logger.js';

let limiter: Bottleneck;

export function initLimiter(config: Config): void {
  limiter = new Bottleneck({
    maxConcurrent: config.concurrency,
    minTime: Math.ceil(60_000 / config.requestsPerMinute),
  });

  limiter.on('error', (err) => {
    logger.error(`Bottleneck error: ${err.message}`);
  });
}

export async function withLimit<T>(
  fn: () => Promise<T>,
  retryAttempts: number,
  retryBaseDelayMs: number
): Promise<T> {
  return limiter.schedule(() => withRetry(fn, retryAttempts, retryBaseDelayMs));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attemptsLeft: number,
  baseDelayMs: number,
  attempt = 1
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const is429  = err?.status === 429 || err?.message?.includes('429');
    const is5xx  = err?.status >= 500;
    const retry  = (is429 || is5xx) && attemptsLeft > 1;

    if (!retry) throw err;

    const retryAfter = Number(err?.headers?.['retry-after']) * 1000 || 0;
    const delay = retryAfter || baseDelayMs * Math.pow(2, attempt - 1);

    logger.warn(`Retry ${attempt}/${attemptsLeft - 1} after ${delay}ms — ${err.message}`);
    await sleep(delay);

    return withRetry(fn, attemptsLeft - 1, baseDelayMs, attempt + 1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}