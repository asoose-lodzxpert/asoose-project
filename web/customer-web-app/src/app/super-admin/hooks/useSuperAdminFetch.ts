import { createClient } from "../../../../utils/supabase/client";
// Validate environment variables at module load
const BACKEND_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    console.error('NEXT_PUBLIC_API_URL is not defined, using fallback');
    return 'http://localhost:3001/api';
  }
  return url;
})();

interface FetcherOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  signal?: AbortSignal;
}

interface FetcherError extends Error {
  status?: number;
  info?: any;
}

/**
 * Production-ready fetcher for SWR with Supabase authentication
 * @param url - API endpoint path (will be appended to BACKEND_URL)
 * @param options - Configuration options for retry logic and timeout
 * @returns Promise with the JSON response
 */
export const fetcher = async <T = any>(
  url: string,
  options: FetcherOptions = {}
): Promise<T> => {
  const {
    retries = 2,
    retryDelay = 1000,
    timeout = 30000,
    signal,
  } = options;

  const supabase = createClient();

  // Get and validate session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    const error: FetcherError = new Error('Session error: ' + sessionError.message);
    error.status = 401;
    throw error;
  }

  if (!session) {
    const error: FetcherError = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  // Check token expiration and refresh if needed (within 60 seconds of expiry)
  let activeSession = session;
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt && expiresAt - now < 60) {
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession();

    if (refreshError) {
      console.warn('Failed to refresh session:', refreshError.message);
    } else if (refreshedSession) {
      activeSession = refreshedSession;
    }
  }

  const fullUrl = `${BACKEND_URL}${url}`;
  let lastError: FetcherError | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine external signal with timeout signal
    const combinedSignal = signal
      ? combineAbortSignals(signal, controller.signal)
      : controller.signal;

    try {
      const res = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${activeSession.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // Success case
      if (res.ok) {
        const data = await res.json();
        return data as T;
      }

      // Handle client errors (4xx) - don't retry except for rate limiting
      if (res.status >= 400 && res.status < 500) {
        // Retry on rate limiting
        if (res.status === 429 && attempt < retries) {
          const retryAfter = res.headers.get('Retry-After');
          const delay = retryAfter 
            ? parseInt(retryAfter, 10) * 1000 
            : retryDelay * Math.pow(2, attempt);
          
          await sleep(delay);
          continue;
        }

        // Don't retry other client errors
        const error: FetcherError = new Error(getErrorMessage(res.status));
        error.status = res.status;

        // Include detailed error info only in development
        if (process.env.NODE_ENV === 'development') {
          try {
            error.info = await res.json();
          } catch {
            // Ignore JSON parse errors
          }
        }

        throw error;
      }

      // Handle server errors (5xx) - retry
      if (res.status >= 500) {
        lastError = new Error(`Server error: ${res.status}`) as FetcherError;
        lastError.status = res.status;

        if (attempt < retries) {
          await sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

        throw lastError;
      }

      // Unexpected status code
      const error: FetcherError = new Error(`Unexpected response: ${res.status}`);
      error.status = res.status;
      throw error;

    } catch (err) {
      clearTimeout(timeoutId);

      // Handle AbortError (timeout or external cancellation)
      if (err instanceof Error && err.name === 'AbortError') {
        const error: FetcherError = new Error(
          signal?.aborted ? 'Request cancelled' : 'Request timeout'
        );
        error.status = 408;
        throw error;
      }

      // Handle network errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        lastError = new Error('Network error - please check your connection') as FetcherError;
        lastError.status = 0;

        if (attempt < retries) {
          await sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

        throw lastError;
      }

      // Re-throw FetcherErrors
      if (isFetcherError(err)) {
        throw err;
      }

      // Wrap unknown errors
      lastError = new Error('An unexpected error occurred') as FetcherError;
      if (process.env.NODE_ENV === 'development' && err instanceof Error) {
        lastError.info = { originalError: err.message };
      }

      if (attempt === retries) {
        throw lastError;
      }

      await sleep(retryDelay * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error('Request failed after all retries');
};

// Helper functions

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Unauthorized - please sign in again';
    case 403:
      return 'Forbidden - you do not have permission';
    case 404:
      return 'Resource not found';
    case 422:
      return 'Validation error';
    default:
      return 'Request failed';
  }
}

function isFetcherError(error: unknown): error is FetcherError {
  return error instanceof Error && 'status' in error;
}

function combineAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const abort = () => controller.abort();

  if (signal1.aborted || signal2.aborted) {
    abort();
  } else {
    signal1.addEventListener('abort', abort);
    signal2.addEventListener('abort', abort);
  }

  return controller.signal;
}

// Optional: Create a configured instance for common use
export const createFetcher = (defaultOptions: FetcherOptions = {}) => {
  return <T = any>(url: string, options?: FetcherOptions): Promise<T> => {
    return fetcher<T>(url, { ...defaultOptions, ...options });
  };
};

