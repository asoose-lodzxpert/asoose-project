import { getCookie } from "cookies-next"; // ✅ Import to access cookies

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// Browser requests use a same-origin Next.js rewrite to avoid CORS preflight
// failures for methods such as DELETE and PATCH. Server-side calls can reach
// the backend directly without a browser CORS boundary.
const getApiUrl = () =>
  typeof window === "undefined" ? BACKEND_API_URL : "/api/backend";

// ── Cached session token ────────────────────────────────────────────────────
// We cache the token from the last successful getSession() call so that
// subsequent requests within the same page lifecycle don't trigger a new
// network round-trip to /api/auth/session, which was the primary driver of
// the infinite re-render loop (every getSession() call refetches the session,
// which triggers useSession() consumers to re-render, which fire new API
// calls, which call getSession() again → infinite loop).
let _cachedSessionToken: string | null = null;
let _cacheExpiry = 0;
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedSessionToken(): Promise<string | null> {
  // Return cached token if still valid
  if (_cachedSessionToken && Date.now() < _cacheExpiry) {
    return _cachedSessionToken;
  }

  // Lazy-import getSession to avoid module-level side effects
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const token = session?.accessToken as string | null;

  if (token) {
    _cachedSessionToken = token;
    _cacheExpiry = Date.now() + SESSION_CACHE_TTL_MS;
  }

  return token ?? null;
}

/** Call this on sign-out to clear the cached token immediately. */
export function clearApiSessionCache(): void {
  _cachedSessionToken = null;
  _cacheExpiry = 0;
}

/**
 * Combines multiple AbortSignals so that aborting ANY one cancels the request.
 * Returns a single AbortSignal that fires when the first source signal aborts.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
      signal: controller.signal,        // auto-cleanup when controller itself aborts
    });
  }
  return controller.signal;
}

export class ApiService {
  private static async getHeaders(token?: string) {
    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    }

    // 1. Try getting token from cookies first (no network call)
    // (This handles cases where NextAuth session isn't synced but the cookie exists)
    const cookieToken = getCookie("accessToken");

    // 2. Fallback: use the cached session token (avoids per-request /api/auth/session fetch)
    const accessToken = cookieToken || (await getCachedSessionToken());

    return {
      "Content-Type": "application/json",
      ...(accessToken && {
        Authorization: `Bearer ${accessToken}`,
      }),
    };
  }

  /** Default request timeout (15 seconds) */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  static async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {},
    token?: string,
  ): Promise<T> {
    const headers = await this.getHeaders(token);
    const url = `${getApiUrl()}${endpoint}`;

    // --- FormData Handling ---
    // If we're sending FormData, the browser MUST set the Content-Type header
    // with its unique boundary. If we provide application/json here, the server
    // will fail to parse the body.
    if (options.body instanceof FormData) {
      delete (headers as any)["Content-Type"];
    }

    // Use caller-supplied timeout, or fall back to the global default
    const { timeoutMs: callerTimeout, ...fetchOptions } = options;
    const effectiveTimeout = callerTimeout ?? this.REQUEST_TIMEOUT_MS;

    // --- Timeout handling ---
    // If the caller already supplied a signal (e.g. for manual abort) we chain
    // it with our own timeout so both can cancel the request.
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(),
      effectiveTimeout,
    );

    // Combine caller signal + timeout signal
    const callerSignal = fetchOptions.signal;
    const combinedSignal = callerSignal
      ? anySignal([callerSignal, timeoutController.signal])
      : timeoutController.signal;

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
      });
    } catch (networkError: any) {
      clearTimeout(timeoutId);

      // Re-throw caller-initiated aborts as-is (e.g. user navigated away)
      if (callerSignal?.aborted) {
        throw networkError;
      }

      // Timeout
      if (timeoutController.signal.aborted) {
        console.error(`ApiService: Request timed out after ${effectiveTimeout}ms — ${fetchOptions.method ?? "GET"} ${url}`);
        throw {
          status: 0,
          message: "Request timed out. The server took too long to respond.",
          type: "timeout",
        };
      }

      // Connection refused / DNS failure / network offline
      console.error(`ApiService: Network error — ${options.method ?? "GET"} ${url}`, networkError);
      throw {
        status: 0,
        message: "Cannot reach the server. Please check that the backend is running and try again.",
        type: "network-error",
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle Unauthorized (401) explicitly
    if (response.status === 401) {
      console.error("ApiService: Unauthorized (401). Session may be expired.");
      // Clear the cached session token so subsequent requests don't reuse it
      clearApiSessionCache();

      // Sign out via NextAuth so the JWT cookie is cleared. This prevents the
      // redirect loop that occurred when we hard-navigated to /sign-in while
      // the NextAuth JWT was still valid (middleware would redirect back to
      // /main/store → another 401 → /sign-in → redirect → ...).
      if (typeof window !== "undefined" && !window.location.pathname.includes('/sign-in')) {
        import("next-auth/react").then(({ signOut }) => {
          signOut({ callbackUrl: "/sign-in?reason=session_expired" });
        });
      }
      throw {
        status: 401,
        message: "Session expired. Please log in again.",
        type: "unauthorized"
      };
    }

    if (!response.ok) {
      let error: Record<string, unknown> = {};
      try {
        error = await response.json();
      } catch {
        error = { message: "Request failed" };
      }
      throw {
        status: response.status,
        message: error.message || `HTTP ${response.status} - Request failed`,
        details: error.details,
        type: "api-error"
      };
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      return {} as T;
    }

    // The backend wraps every response as { success, message, data } —
    // unwrap here so every caller can type T as the actual payload instead
    // of repeating this check at every call site.
    if (
      parsed &&
      typeof parsed === "object" &&
      "success" in parsed &&
      "data" in parsed
    ) {
      return (parsed as { data: T }).data;
    }

    return parsed as T;
  }



  static async get<T>(endpoint: string, token?: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options }, token);
  }

  static async post<T>(
    endpoint: string,
    data?: any,
    token?: string,
    options?: RequestInit & { timeoutMs?: number } // supports custom timeout
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        ...options, // ✅ Pass options down (includes timeoutMs if provided)
      },
      token,
    );
  }

  static async put<T>(
    endpoint: string,
    data?: any,
    token?: string,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      },
      token,
    );
  }

  static async patch<T>(
    endpoint: string,
    data?: any,
    token?: string,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      },
      token,
    );
  }

  static async postFormData<T>(
    endpoint: string,
    formData: FormData,
    token?: string,
    options?: RequestInit & { timeoutMs?: number }
  ): Promise<T> {
    const headers = await this.getHeaders(token);
    // CRITICAL: We must remove Content-Type so fetch can set it with the correct boundary
    delete (headers as any)["Content-Type"];

    return this.request<T>(
      endpoint,
      {
        ...options,
        method: "POST",
        body: formData,
        headers: {
          ...headers,
          ...options?.headers,
        },
      } as any,
      token
    );
  }

  static async delete<T>(endpoint: string, token?: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options }, token);
  }
}
