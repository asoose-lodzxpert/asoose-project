import { NotificationConfig } from "@/types/notification-config";
import { request } from "@/lib/authFetch";

export const fetchNotificationConfig =
  async (): Promise<NotificationConfig> => {
    const response = await request("users/notification-config", {
      method: "GET",
    });

    if (response && response.parsed) {
      return response.parsed;
    }

    return response;
  };

export const saveNotificationConfig = async (
  config: NotificationConfig,
): Promise<void> => {
  await request("users/notification-config", {
    method: "PATCH",
    body: JSON.stringify(config),
  });
};
