import { getSession } from "next-auth/react";

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

    const session = await getSession();
    return {
      "Content-Type": "application/json",
      ...(session?.accessToken && {
        Authorization: `Bearer ${session.accessToken}`,
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

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(
        error.message || `HTTP ${response.status} - Request failed`,
      );
    }

    // ✅ FIX: Handle empty responses safely
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    try {
      return text ? JSON.parse(text) : ({} as T);
    } catch {
      // If parsing fails (e.g. server sent plain text instead of JSON), return empty or handle gracefully
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
