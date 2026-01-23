import type {
  NotificationSettings,
  UpdateNotificationSettingsDto,
} from "@/types/notification-settings";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/notification-settings`,
    );
    return response.settings;
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    throw error;
  }
}

export async function updateNotificationSettings(
  data: UpdateNotificationSettingsDto,
): Promise<NotificationSettings> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/notification-settings`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return response.settings;
  } catch (error) {
    console.error("Error updating notification settings:", error);
    throw error;
  }
}
