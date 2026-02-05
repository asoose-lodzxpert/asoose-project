/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  onRetry: () => {},
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt - 1),
        opts.maxDelay,
      );

      opts.onRetry(attempt, lastError);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx errors)
 * @param error The error to check
 * @returns Whether the error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes("Network request failed")) return true;
  if (error.message?.includes("timeout")) return true;
  if (error.code === "ECONNABORTED") return true;

  // HTTP errors
  if (error.response?.status >= 500) return true;
  if (error.response?.status === 429) return true; // Rate limit

  return false;
}

/**
 * Retry only if the error is retryable
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise with the result of the function
 */
export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  try {
    return await retryWithBackoff(fn, {
      ...options,
      maxAttempts: 1,
    });
  } catch (error) {
    if (isRetryableError(error)) {
      return await retryWithBackoff(fn, options);
    }
    throw error;
  }
}
