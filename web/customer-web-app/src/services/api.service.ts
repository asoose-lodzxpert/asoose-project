import { getSession } from "next-auth/react";
import { getCookie } from "cookies-next"; // ✅ Import to access cookies

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string,
  ): Promise<T> {
    const headers = await this.getHeaders(token);

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // ✅ FIX: Handle Unauthorized (401) explicitly
    if (response.status === 401) {
      console.error("ApiService: Unauthorized (401). Session may be expired.");
      
      // Force redirect to login if happening client-side
      if (typeof window !== "undefined" && !window.location.pathname.includes('/sign-in')) {
        window.location.href = "/sign-in?reason=session_expired";
      }
      
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      // Attempt to parse error message from backend
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      
      // Throw error with status for easier debugging
      throw new Error(error.message || `HTTP ${response.status} - Request failed`);
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

  static async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, token);
  }

  static async post<T>(
    endpoint: string,
    data?: any,
    token?: string,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      token,
    );
  }

  static async put<T>(
    endpoint: string,
    data?: any,
    token?: string,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      token,
    );
  }

  static async patch<T>(
    endpoint: string,
    data?: any,
    token?: string,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
      },
      token,
    );
  }

  static async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, token);
  }
}
