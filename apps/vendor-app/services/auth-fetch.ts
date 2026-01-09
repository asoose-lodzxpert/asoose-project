import { getAccessToken } from "@/services/auth";

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No access token");
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}

export async function fetchCurrentUser() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/me`
  );
}
