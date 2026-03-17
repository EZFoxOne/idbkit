import { ErrorCodes } from './errors.js';

const RETRYABLE_CODES = new Set([ErrorCodes.UNKNOWN, ErrorCodes.QUOTA_EXCEEDED]);

/**
 * Execute fn with retry on transient failures
 * @param {() => Promise<T>} fn
 * @param {{ maxAttempts?: number, backoffMs?: number }} options
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
  const { maxAttempts = 3, backoffMs = 100 } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const code = err?.code ?? ErrorCodes.UNKNOWN;
      if (!RETRYABLE_CODES.has(code) || attempt === maxAttempts) {
        throw err;
      }
      await sleep(backoffMs * attempt);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
