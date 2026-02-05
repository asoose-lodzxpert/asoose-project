import { getAccessToken, refreshAccessToken } from "@/services/auth";

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken();

  if (!accessToken) throw new Error("No access token");

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
      }

      const newAccessToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      const retryHeaders = {
        ...(options.headers || {}),
        Authorization: `Bearer ${newAccessToken}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      };

      const retryRes = await fetch(url, { ...options, headers: retryHeaders });

      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({}));
        throw new Error(error.message || "Request failed");
      }

      return retryRes.json();
    } catch (refreshError) {
      isRefreshing = false;
      refreshPromise = null;

      throw new Error("Session expired. Please login again.");
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }

  return res.json();
}

export async function fetchCurrentUser() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/dashboard/me`,
  );
}
