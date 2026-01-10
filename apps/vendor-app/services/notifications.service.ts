import { fetchWithAuth } from "./auth-fetch";

const API = process.env.EXPO_PUBLIC_API_URL;

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string; // ORDER_CREATED, ORDER_UPDATE, PAYOUT_APPROVED, PAYOUT_REJECTED, SYSTEM
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
    pages: number;
  };
}

export async function fetchNotifications(
  page: number = 1
): Promise<NotificationsResponse> {
  return fetchWithAuth(`${API}/notifications?page=${page}`);
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return fetchWithAuth(`${API}/notifications/unread-count`);
}

export async function markAsRead(notificationId: string): Promise<void> {
  return fetchWithAuth(`${API}/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllAsRead(): Promise<void> {
  return fetchWithAuth(`${API}/notifications/read-all`, {
    method: "PATCH",
  });
}

// Helper to determine notification category for filtering
export function getNotificationType(
  type: string
): "orders" | "payouts" | "system" {
  if (type.includes("ORDER")) return "orders";
  if (type.includes("PAYOUT")) return "payouts";
  return "system";
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
