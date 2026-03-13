import {
  initializeNotificationHandler,
  registerForPushNotificationsAsync,
  savePushToken,
  setupNotificationCategories,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from "@/services/push-notifications.service";
import { fetchUnreadCount } from "@/services/user-notifications.service";
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
      const result = await fetchUnreadCount();
      if (typeof result === "number") {
        setUnreadCount(result);
      } else if (result?.count != null) {
        setUnreadCount(result.count);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initialize notification handler first (must be done after React Native is ready)
    initializeNotificationHandler();

    // Setup notification categories
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

    // Listen for user interactions with notifications
    responseListener.current = addNotificationResponseListener(
      async (response) => {
        const data = response.notification.request.content.data;
        const actionId = response.actionIdentifier;

        // Dispute notifications — navigate to the dispute detail page
        if (data.type === "DISPUTE_MESSAGE" || data.type === "DISPUTE_UPDATE") {
          if (data.disputeId) {
            router.push(`/(settings)/dispute/${data.disputeId}` as any);
          } else {
            router.push("/(settings)/disputes" as any);
          }
          return;
        }

        // Handle action buttons
        if (actionId === "view" && data.orderId) {
          router.push("/(tabs)/orders" as any);
        } else if (data.orderId) {
          router.push("/(tabs)/orders" as any);
        } else if (data.rideId) {
          router.push("/(tabs)/activity" as any);
        } else if (data.deliveryId) {
          router.push("/(tabs)/activity" as any);
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
