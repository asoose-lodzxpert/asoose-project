import { NotificationConfig } from "@/types/notification-config";

// Simulate fetching notification config from an API
export const fetchNotificationConfig =
  async (): Promise<NotificationConfig> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve({
          push: true,
          sms: false,
          email: true,
          emergencyAlerts: true,
          tripUpdates: true,
        });
      }, 1000)
    );
  };

// Simulate saving notification config to an API
export const saveNotificationConfig = async (
  config: NotificationConfig
): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 600));
};
