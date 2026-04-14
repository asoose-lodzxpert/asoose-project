import { DeviceEventEmitter } from "react-native";
import {
  authConfig,
  getAccessToken,
  refreshAccessToken,
} from "@/services/auth.service";

const BACKEND_URL = `${authConfig.apiBase}/`;

type FetchOpts = RequestInit & { absolute?: boolean };

/**
 * Hook that returns helpers for making requests with the access token from AsyncStorage
 * included as a Bearer token in the Authorization header.
 */

let refreshPromise: Promise<string | null> | null = null;

export async function request<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { absolute = false, headers: incomingHeaders, ...rest } = opts;
  const url = absolute ? path : BACKEND_URL + path.replace(/^\/+/, "");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(typeof incomingHeaders === "object"
      ? (incomingHeaders as Record<string, string>)
      : {}),
  };

  let token = await getAccessToken();

  // Check if this is an auth-related endpoint
  const isAuthEndpoint =
    path.includes("/auth/") ||
    path.includes("login") ||
    path.includes("register") ||
    path.includes("forgot-password") ||
    path.includes("reset-password");

  // Block non-auth requests when user is not logged in
  if (!token && !isAuthEndpoint) {
    throw new Error("Authentication required. Please log in.");
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  async function execute() {
    const response = await fetch(url, { headers, ...rest });
    const parsed = await parseBody(response);
    return { response, parsed };
  }

  let { response, parsed } = await execute();

  // Attempt refresh on 401 if we have a token (even if initial token was null, refresh might exist)
  if (response.status === 401) {
    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const newToken = await refreshAccessToken();
            return newToken;
          } catch (err) {
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }
      const newToken = await refreshPromise;
      if (!newToken) {
        DeviceEventEmitter.emit("auth:session-expired");
        throw new Error("Session expired");
      }
      token = newToken;
      headers["Authorization"] = `Bearer ${newToken}`;
      ({ response, parsed } = await execute());
    } catch (error) {
      refreshPromise = null;
      DeviceEventEmitter.emit("auth:session-expired");
      throw error instanceof Error ? error : new Error("Session expired");
    }
  }

  if (!response.ok) throw toError(parsed, response.statusText);
  return parsed;
}

export function get<T = any>(path: string, opts: FetchOpts = {}) {
  return request<T>(path, { method: "GET", ...opts });
}

export function post<T = any>(path: string, body?: any, opts: FetchOpts = {}) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return request<T>(path, { method: "POST", body: payload, ...opts });
}

export function patch<T = any>(path: string, body?: any, opts: FetchOpts = {}) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return request<T>(path, { method: "PATCH", body: payload, ...opts });
}

export { BACKEND_URL as backendUrl };

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toError(body: any, fallback: string) {
  if (!body) return new Error(fallback || "Request failed");
  if (typeof body === "string") return new Error(body);

  // Handle validation errors with detailed messages
  if (body.errors && Array.isArray(body.errors)) {
    const errorMessage = body.message || "Validation failed";
    const details = body.errors.join("; ");
    return new Error(`${errorMessage}: ${details}`);
  }

  if (typeof body.message === "string") return new Error(body.message);
  if (typeof body.error === "string") return new Error(body.error);
  return new Error(fallback || "Request failed");
}
