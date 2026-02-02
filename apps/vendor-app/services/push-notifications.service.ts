import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

// Flag to ensure handler is only set once
let isNotificationHandlerSet = false;

// Configure notification behavior
// This ONLY handles foreground notifications - no background service
// MUST be called after React Native is initialized
export function initializeNotificationHandler() {
  if (isNotificationHandlerSet) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      // Get Expo Push Token (not FCM token)
      // This prevents Android 12+ BackgroundServiceStartNotAllowedException
      // by using Expo's notification service instead of starting Firebase services
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e: any) {
      // Silently fail if push notifications cannot be registered
      // This prevents app crashes on Android 12+ when background services are restricted
      console.warn("Push notification registration failed:", e.message);
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
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/auth/vendor/push-token`, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (error: any) {
    // Surface error for debugging
    console.log("Failed to send push token:", error);
    Toast.show({
      type: "error",
      text1: error.message || "Failed to send push token",
    });
  }
}

// Remove push token (on logout)
export async function removePushToken(): Promise<void> {
  try {
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/auth/vendor/push-token`, {
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
      identifier: "accept",
      buttonTitle: "Accept",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: "decline",
      buttonTitle: "Decline",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("payout", [
    {
      identifier: "view",
      buttonTitle: "View Details",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}
