import { getSession } from "next-auth/react";
import { getCookie } from "cookies-next"; // ✅ Import to access cookies

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

    // 1. Try getting session from NextAuth
    const session = await getSession();
    
    // 2. Fallback: Try getting token directly from cookies
    // (This handles cases where NextAuth session isn't synced but the cookie exists)
    const cookieToken = getCookie("accessToken");

    const accessToken = session?.accessToken || cookieToken;

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
    const url = `${API_URL}${endpoint}`;

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
      if (typeof window !== "undefined" && !window.location.pathname.includes('/sign-in')) {
        window.location.href = "/sign-in?reason=session_expired";
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
    try {
      return text ? JSON.parse(text) : ({} as T);
    } catch {
      return {} as T;
    }
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

  static async delete<T>(endpoint: string, token?: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options }, token);
  }
}
