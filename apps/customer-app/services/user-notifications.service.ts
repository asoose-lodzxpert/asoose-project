import { get } from "../lib/authFetch";

export async function fetchUserNotifications(page = 1) {
  return get(`notifications?page=${page}`);
}

export async function fetchUnreadCount() {
  return get(`notifications/unread-count`);
}

export async function markAllAsRead() {
  return get(`notifications/read-all`, { method: "PATCH" });
}

export async function markNotificationAsRead(id: string) {
  return get(`notifications/${id}/read`, { method: "PATCH" });
}

export async function deleteNotification(id: string) {
  return get(`notifications/${id}`, { method: "DELETE" });
}
