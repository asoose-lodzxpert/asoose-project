import { getSession } from "next-auth/react";
import { NotificationResponse } from "../types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

/** Shared auth-bearing fetch helper */
async function authFetch(path: string, init?: RequestInit) {
  const session = await getSession();
  const token = (session as any)?.accessToken;
  if (!token) throw new Error("No session found");

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/**
 * All methods point to the super-admin system-wide notifications endpoint.
 * The `type` param narrows results to ORDER | RIDE | DELIVERY (omit for All).
 */
export const NotificationService = {
  async getAll(page = 1, type?: string): Promise<NotificationResponse> {
    const params = new URLSearchParams({ page: String(page) });
    if (type && type !== "ALL") params.set("type", type);
    return authFetch(`/super-admin/notifications?${params}`);
  },

  async markAsRead(id: string) {
    return authFetch(`/super-admin/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  async markAllAsRead(type?: string) {
    const params = new URLSearchParams();
    if (type && type !== "ALL") params.set("type", type);
    return authFetch(`/super-admin/notifications/read-all?${params}`, {
      method: "PATCH",
    });
  },

  async sendTestPush(
    title = "🔔 Test Notification",
    message = "This is a test push notification from the Asoose admin panel.",
  ): Promise<{ success: boolean; tokensFound: number; message?: string }> {
    return authFetch(`/super-admin/notifications/push/test`, {
      method: "POST",
      body: JSON.stringify({ title, message }),
    });
  },
};
