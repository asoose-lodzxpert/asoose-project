import { fetchWithAuth } from "./auth-fetch";

const API = process.env.EXPO_PUBLIC_API_URL;

export interface Notification {
  id: string;
  vendorId: string;
  title: string;
  message: string;
  type: "ORDER" | "PAYOUT" | "SYSTEM"; // Notification types
  category?: string;
  isRead: boolean;
  metadata?: {
    orderId?: string;
    storeId?: string;
    payoutId?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function fetchNotifications(
  page: number = 1,
  type?: "ORDER" | "PAYOUT" | "SYSTEM",
  isRead?: boolean
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: "20",
  });

  if (type) {
    params.append("type", type);
  }

  if (isRead !== undefined) {
    params.append("isRead", isRead.toString());
  }

  return fetchWithAuth(`${API}/vendor/notifications?${params.toString()}`);
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return fetchWithAuth(`${API}/vendor/notifications/unread-count`);
}

export async function markAsRead(notificationId: string): Promise<void> {
  return fetchWithAuth(`${API}/vendor/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllAsRead(): Promise<void> {
  return fetchWithAuth(`${API}/vendor/notifications/read-all`, {
    method: "PATCH",
  });
}

// Helper to determine notification category for filtering
export function getNotificationType(
  type: "ORDER" | "PAYOUT" | "SYSTEM"
): "orders" | "payouts" | "system" {
  if (type === "ORDER") return "orders";
  if (type === "PAYOUT") return "payouts";
  return "system";
}

// Map tab to API type filter
export function getApiTypeFromTab(
  tab: "orders" | "payouts" | "system"
): "ORDER" | "PAYOUT" | "SYSTEM" | undefined {
  const mapping = {
    orders: "ORDER" as const,
    payouts: "PAYOUT" as const,
    system: "SYSTEM" as const,
  };
  return mapping[tab];
}

export async function getNotificationPreferences() {
  const res = await fetchWithAuth(
    `${API}/auth/vendor/notifications-preferences`
  );
  return res;
}

export async function updateNotificationPreferences(preferences: any) {
  const res = await fetchWithAuth(
    `${API}/auth/vendor/notifications-preferences`,
    {
      method: "PUT",
      body: JSON.stringify(preferences),
      headers: { "Content-Type": "application/json" },
    }
  );
  return res;
}
