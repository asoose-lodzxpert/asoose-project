import { NotificationConfig } from "@/types/notification-config";
import { request } from "@/lib/authFetch";

export const fetchNotificationConfig =
  async (): Promise<NotificationConfig> => {
    const { parsed } = await request("users/notification-config", {
      method: "GET",
    });
    return parsed;
  };

export const saveNotificationConfig = async (
  config: NotificationConfig,
): Promise<void> => {
  await request("users/notification-config", {
    method: "PATCH",
    body: JSON.stringify(config),
  });
};
