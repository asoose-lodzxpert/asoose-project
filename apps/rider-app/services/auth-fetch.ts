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

/**
 * For unauthenticated requests (e.g. signup, locations list)
 */
export async function fetchPublic(url: string, options: RequestInit = {}) {
  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }

  return res.json();
}

export async function fetchCurrentUser() {
  const response = await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/rider/profile/me`,
  );
  // Backend returns { user: {...} } — unwrap so callers get the flat user object
  return response?.user ?? response;
}

export async function fetchWithAuthMultipart(url: string, formData: FormData) {
  const accessToken = await getAccessToken();

  if (!accessToken) throw new Error("No access token");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,

    // Don't set Content-Type - let browser set it with boundary for multipart/form-data
  };

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
  });

  if (res.status === 401) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
      }

      const newAccessToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      const retryHeaders: Record<string, string> = {
        Authorization: `Bearer ${newAccessToken}`,

      };

      const retryRes = await fetch(url, {
        method: "POST",
        body: formData,
        headers: retryHeaders,
      });

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
