import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { RelativePathString, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  registerForPushNotificationsAsync,
  savePushToken,
  setupNotificationCategories,
} from "@/services/push-notifications.service";
import { acceptOrder, declineOrder } from "@/services/orders.service";
import { useAuth } from "./AuthContext";

type NotificationContextType = {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
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

  useEffect(() => {
    if (!user) return;

    // Setup notification categories
    setupNotificationCategories();

    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushToken(token);
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
        setNotification(notification);
        setUnreadCount((prev) => prev + 1);
      });

    // Listen for user interactions with notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("Notification response:", response);

          const data = response.notification.request.content.data;
          const actionId = response.actionIdentifier;

          // Handle action buttons
          if (actionId === "accept" && data.orderId) {
            try {
              await acceptOrder(data.orderId as string);
              Toast.show({
                type: "success",
                text1: "Order accepted",
              });
              router.push("/(main)/(orders)");
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: error.message || "Failed to accept order",
              });
            }
          } else if (actionId === "decline" && data.orderId) {
            router.push("/(main)/(orders)" as RelativePathString);
          } else if (data.orderId) {
            router.push("/(main)/(orders)" as RelativePathString);
          } else if (data.payoutId) {
            router.push("/(profile)/withdrawal" as RelativePathString);
          }
        }
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
      "useNotifications must be used within NotificationProvider"
    );
  return ctx;
}
