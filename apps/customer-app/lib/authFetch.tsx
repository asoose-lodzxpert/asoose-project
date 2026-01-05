import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_BACKEND = "https://asoose.com/api/v1/";
const BACKEND_URL =
  (process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "") + "/";

type FetchOpts = RequestInit & { absolute?: boolean };

/**
 * Hook that returns helpers for making requests that include the current user's id.
 * The user id is attached as `X-User-Id` header. If you use tokens, you can extend this
 * to include Authorization header.
 */
export function useAuthFetch() {
  const { user } = useAuth();

  const request = useCallback(
    async (path: string, opts: FetchOpts = {}) => {
      const { absolute = false, headers: incomingHeaders, ...rest } = opts;
      const url = absolute ? path : BACKEND_URL + path.replace(/^\/+/, "");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(typeof incomingHeaders === "object"
          ? (incomingHeaders as Record<string, string>)
          : {}),
      };

      if (user?.id) headers["X-User-Id"] = user.id;

      const res = await fetch(url, { headers, ...rest });
      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch (e) {
        body = text;
      }

      if (!res.ok) throw body || new Error(`HTTP ${res.status}`);
      return body;
    },
    [user]
  );

  const get = useCallback(
    (path: string, opts: FetchOpts = {}) =>
      request(path, { method: "GET", ...opts }),
    [request]
  );
  const post = useCallback(
    (path: string, body?: any, opts: FetchOpts = {}) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      return request(path, { method: "POST", body: payload, ...opts });
    },
    [request]
  );

  return { request, get, post, backendUrl: BACKEND_URL };
}

export default useAuthFetch;
