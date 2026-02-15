import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { request } from "@/lib/authFetch";

// Flag to ensure handler is only set once
let isNotificationHandlerSet = false;

// Configure notification behavior
// This ONLY handles foreground notifications - no background service
// MUST be called after React Native is initialized
export function initializeNotificationHandler() {
  if (isNotificationHandlerSet) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // shouldShowAlert is deprecated; use shouldShowBanner and shouldShowList
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });

  isNotificationHandlerSet = true;
}

// Request permissions and get push token
// This uses Expo's push notification service, NOT Firebase directly
// Backend should send notifications via Expo Push API
export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  let token;

  if (Platform.OS === "android") {
    // Create notification channels for Android 8.0+
    // These channels only affect foreground notifications
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });

    // Create order notifications channel
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#FF6B46",
      sound: "default",
      enableVibrate: true,
    });

    // Create ride notifications channel
    await Notifications.setNotificationChannelAsync("rides", {
      name: "Ride Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#3AB795",
      sound: "default",
      enableVibrate: true,
    });

    // Create delivery notifications channel
    await Notifications.setNotificationChannelAsync("deliveries", {
      name: "Delivery Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#F59E0B",
      sound: "default",
      enableVibrate: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      if (__DEV__) {
        console.warn(
          "[Push Notifications] Permission not granted, cannot register for push notifications",
        );
      }
      Toast.show({
        type: "warning",
        text1: "Notifications disabled",
        text2: "Enable notifications in settings to receive updates",
      });
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Expo projectId missing in production build");
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e: any) {
      // Silently fail if push notifications cannot be registered
      // This prevents app crashes on Android 12+ when background services are restricted

      Toast.show({
        type: "warning",
        text1: "Push notification setup failed",
        text2: "You may not receive real-time updates",
      });
      return undefined;
    }
  } else {
    return undefined;
  }

  return token;
}

// Save push token to backend
export async function savePushToken(token: string): Promise<void> {
  try {
    await request("users/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (error: any) {
    // Surface error for debugging
    Toast.show({
      type: "error",
      text1: "Push notification setup failed",
      text2: error.message || "Failed to send push token",
    });

    throw error; // Re-throw to allow caller to handle
  }
}

// Remove push token (on logout)
export async function removePushToken(): Promise<void> {
  try {
    await request("users/push-token", {
      method: "DELETE",
    });
  } catch (error) {
    // Silent error handling
  }
}

// Set up notification categories with actions
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("order", [
    {
      identifier: "view",
      buttonTitle: "View Order",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("ride", [
    {
      identifier: "view",
      buttonTitle: "View Ride",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("delivery", [
    {
      identifier: "view",
      buttonTitle: "Track Package",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}

/**
 * Helper to register event listener for notification responses (actions tapped).
 * The consumer can use the returned subscription to remove the listener later.
 */
export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Helper to subscribe to incoming notifications while app is foregrounded.
 * Returns the subscription so caller can remove it.
 */
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(listener);
}

export default {
  initializeNotificationHandler,
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,
  setupNotificationCategories,
  addNotificationResponseListener,
  addNotificationReceivedListener,
};
