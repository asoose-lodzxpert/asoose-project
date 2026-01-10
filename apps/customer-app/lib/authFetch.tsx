import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_BACKEND = "https://asoose.com/api/v1/";
const BACKEND_URL =
  (process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "") + "/";

type FetchOpts = RequestInit & { absolute?: boolean };

const ACCESS_TOKEN_KEY = "@auth/access_token";

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

    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { headers, ...rest });
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!res.ok) throw body || new Error(`HTTP ${res.status}`);
    return body;
  }, []);

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
