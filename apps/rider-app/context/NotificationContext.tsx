import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  initializeNotificationHandler,
  registerForPushNotificationsAsync,
  savePushToken,
  setupNotificationCategories,
} from "@/services/notification.service";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Toast from "react-native-toast-message";
import { useAuth } from "./AuthContext";
import { jobsService } from "@/services/jobs.service";
import { getUnreadCount } from "@/services/notifications.service";

type NotificationContextType = {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] =
    useState<Notifications.Notification>();
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Function to refresh unread count from backend
  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silent error handling
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initialize notification handler first
    initializeNotificationHandler();

    // Setup notification categories (like 'job' with Accept/Decline buttons)
    setupNotificationCategories();

    // Register for push notifications
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setExpoPushToken(token);
          // Save token to backend
          savePushToken(token)
            .then(() => {})
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Load initial unread count
    refreshUnreadCount();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        setUnreadCount((prev) => prev + 1);
      },
    );

    // Listen for user interactions with notifications (taps and buttons)
    responseListener.current = addNotificationResponseListener(
      async (response) => {
        const data = response.notification.request.content.data;
        const actionId = response.actionIdentifier;

        // Handle "Accept" button click directly from the notification shade
        if (actionId === "accept" && data.jobId) {
          try {
            await jobsService.acceptJob(
              data.jobId as string,
              data.jobType as "ride" | "delivery",
            );
            Toast.show({
              type: "success",
              text1: "Job accepted",
            });
            // Redirect to orders to see the active job state
            router.push("/(tabs)/orders");
          } catch (error: any) {
            Toast.show({
              type: "error",
              text1: error.message || "Failed to accept job",
            });
          }
        }
        // Handle "Decline" button click or general Job notifications
        else if (actionId === "decline" || data.jobId) {
          // Navigating to /orders triggers the state restoration logic in JobContext
          router.push("/(tabs)/orders");
        }
        // Handle Payout notifications
        else if (data.payoutId) {
          router.push("/(earnings)/withdraw");
        }
      },
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        unreadCount,
        setUnreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return ctx;
}
