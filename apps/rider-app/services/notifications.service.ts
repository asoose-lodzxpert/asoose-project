import { fetchWithAuth } from "./auth-fetch";
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from "@/types/notification";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getNotifications(
  page: number = 1,
  limit: number = 20,
  type?: string,
  isRead?: boolean,
): Promise<NotificationListResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (type) params.append("type", type);
    if (isRead !== undefined) params.append("isRead", isRead.toString());

    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/notifications?${params.toString()}`,
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch notifications",
    );
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/notifications/unread-count`,
    );
    return response.count || 0;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch unread count",
    );
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/notifications/${notificationId}/read`,
      { method: "PATCH" },
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to mark notification as read",
    );
  }
}

export async function markAllAsRead(): Promise<void> {
  try {
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/rider/notifications/read-all`, {
      method: "PATCH",
    });
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to mark all as read",
    );
  }
}
