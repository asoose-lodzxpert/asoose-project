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
  console.log("[Push Notifications] Starting registration...");
  console.log(
    "[Push Notifications] Device type:",
    Device.isDevice ? "Physical Device" : "Simulator/Emulator",
  );
  console.log("[Push Notifications] Platform:", Platform.OS);

  let token;

  if (Platform.OS === "android") {
    console.log(
      "[Push Notifications] Setting up Android notification channels...",
    );
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
    console.log("[Push Notifications] Android channels created successfully");
  }

  if (Device.isDevice) {
    console.log("[Push Notifications] Checking notification permissions...");
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log(
      "[Push Notifications] Current permission status:",
      existingStatus,
    );

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log(
        "[Push Notifications] Requesting notification permissions...",
      );
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("[Push Notifications] Permission request result:", status);
    }

    if (finalStatus !== "granted") {
      console.warn(
        "[Push Notifications] Permission not granted, cannot register for push notifications",
      );
      Toast.show({
        type: "warning",
        text1: "Notifications disabled",
        text2: "Enable notifications in settings to receive order updates",
      });
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      console.log("[Push Notifications] EAS Project ID:", projectId);

      // Get Expo Push Token (not FCM token)
      // This prevents Android 12+ BackgroundServiceStartNotAllowedException
      // by using Expo's notification service instead of starting Firebase services
      console.log("[Push Notifications] Requesting Expo push token...");
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log("[Push Notifications] Token received successfully:", token);
    } catch (e: any) {
      // Silently fail if push notifications cannot be registered
      // This prevents app crashes on Android 12+ when background services are restricted
      console.error(
        "[Push Notifications] Push notification registration failed:",
        e,
      );
      console.error("[Push Notifications] Error details:", {
        message: e.message,
        code: e.code,
        stack: e.stack,
      });

      Toast.show({
        type: "warning",
        text1: "Push notification setup failed",
        text2: "You may not receive order notifications",
      });
      return undefined;
    }
  } else {
    console.warn(
      "[Push Notifications] Not running on a physical device, skipping token registration",
    );
    return undefined;
  }

  return token;
}

// Save push token to backend
export async function savePushToken(token: string): Promise<void> {
  console.log(
    "[Push Notifications] Attempting to save push token to backend...",
  );
  console.log("[Push Notifications] Token:", token);
  console.log("[Push Notifications] API URL:", EXPO_PUBLIC_API_URL);
  console.log("[Push Notifications] Platform:", Platform.OS);

  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/auth/vendor/push-token`,
      {
        method: "POST",
        body: JSON.stringify({ token, platform: Platform.OS }),
      },
    );

    console.log("[Push Notifications] Token saved successfully:", response);
  } catch (error: any) {
    // Surface error for debugging
    console.error("[Push Notifications] Failed to send push token:", error);
    console.error("[Push Notifications] Error details:", {
      message: error.message,
      stack: error.stack,
    });

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
