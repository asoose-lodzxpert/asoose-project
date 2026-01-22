import { useCallback } from "react";
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
export function useAuthFetch() {
  const request = useCallback(async (path: string, opts: FetchOpts = {}) => {
    const { absolute = false, headers: incomingHeaders, ...rest } = opts;
    const url = absolute ? path : BACKEND_URL + path.replace(/^\/+/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(typeof incomingHeaders === "object"
        ? (incomingHeaders as Record<string, string>)
        : {}),
    };

    let token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    async function execute() {
      const response = await fetch(url, { headers, ...rest });
      const parsed = await parseBody(response);
      return { response, parsed };
    }

    let { response, parsed } = await execute();

    if (response.status === 401 && token) {
      try {
        const newToken = await refreshAccessToken();
        token = newToken;
        headers["Authorization"] = `Bearer ${newToken}`;
        ({ response, parsed } = await execute());
      } catch (error) {
        throw error instanceof Error ? error : new Error("Session expired");
      }
    }

    if (!response.ok) throw toError(parsed, response.statusText);
    return parsed;
  }, []);

  const get = useCallback(
    (path: string, opts: FetchOpts = {}) =>
      request(path, { method: "GET", ...opts }),
    [request],
  );

  const post = useCallback(
    (path: string, body?: any, opts: FetchOpts = {}) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      return request(path, { method: "POST", body: payload, ...opts });
    },
    [request],
  );

  return { request, get, post, backendUrl: BACKEND_URL };
}

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
  if (typeof body.message === "string") return new Error(body.message);
  if (typeof body.error === "string") return new Error(body.error);
  return new Error(fallback || "Request failed");
}

export default useAuthFetch;
