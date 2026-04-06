import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fetchWithAuth } from "./auth-fetch";
import Toast from "react-native-toast-message";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

/** * Centralized Error Logger
 * Sends the error to your backend so you can see what went wrong.
 */
async function logErrorToBackend(context: string, error: any) {
  try {
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/logs/error`, {
      method: "POST",
      body: JSON.stringify({
        context,
        message: error?.message || "Unknown error",
        stack: error?.stack,
        device: Device.modelName,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("Failed to log error to backend", e);
  }
}

/** Utility to show Toast */
function showToast(message: string) {
  Toast.show({
    type: "error",
    autoHide: true,
    text1: message,
  });
}

let isNotificationHandlerSet = false;

export function initializeNotificationHandler() {
  if (isNotificationHandlerSet) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
  isNotificationHandlerSet = true;
}

export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  let token: string | undefined;

  if (Platform.OS === "android") {
    // Default fallback channel
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0EA5E9",
      sound: "notification_alarm",
    });

    // New job/ride assignment — highest priority, alarm sound
    await Notifications.setNotificationChannelAsync("new-job", {
      name: "New Job Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: "#22C55E",
      sound: "notification_alarm",
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
    });

    // Trip / delivery status updates
    await Notifications.setNotificationChannelAsync("trip-updates", {
      name: "Trip & Delivery Updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: "#3AB795",
      sound: "notification_alarm",
      enableVibrate: true,
    });

    // Earnings and payout notifications
    await Notifications.setNotificationChannelAsync("payouts", {
      name: "Earnings & Payouts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
      sound: "notification_alarm",
      enableVibrate: true,
    });
  }

  if (!Device.isDevice) {
    // Optional: show toast if testing on emulator and wondering why it fails
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    showToast("Notification permissions denied. You might miss job alerts.");
    return undefined;
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    console.log("[Push Notifications] Project ID:", projectId);

    if (!projectId) {
      console.error("[Push Notifications] Project ID is missing from Expo config");
      throw new Error("Project ID is missing from Expo config");
    }

    const expoTokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    token = expoTokenRes.data;
    console.log("[Push Notifications] Expo Push Token obtained:", token);
  } catch (e: any) {
    console.error("[Push Notifications] Registration error:", e);
    showToast("Failed to initialize notifications.");
    await logErrorToBackend("registerForPushNotificationsAsync", e);
    return undefined;
  }

  return token;
}

export async function savePushToken(token: string): Promise<void> {
  if (!EXPO_PUBLIC_API_URL) {
    console.error("[Push Notifications] EXPO_PUBLIC_API_URL is not defined!");
    return;
  }

  try {
    console.log("[Push Notifications] Saving token to backend:", token);
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/auth/rider/push-token`, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    console.log("[Push Notifications] Token saved successfully.");
  } catch (error: any) {
    console.error("[Push Notifications] Save token error:", error);
    showToast("Connection error: Notifications might not be synced.");
    await logErrorToBackend("savePushToken", error);
  }
}

// ... rest of your functions (removePushToken, setupNotificationCategories, etc.)

/** Remove push token on logout. */
export async function removePushToken(): Promise<void> {
  try {
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/auth/rider/push-token`, {
      method: "DELETE",
    });
  } catch (error) {
    // Silent
  }
}

/**
 * Set up notification categories / actions for rider.
 * We only register categories for "job" and "payout" notifications.
 */
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("job", [
    {
      identifier: "accept",
      buttonTitle: "Accept",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "decline",
      buttonTitle: "Decline",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "view",
      buttonTitle: "View",
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("payout", [
    {
      identifier: "view",
      buttonTitle: "View Details",
      options: { opensAppToForeground: true },
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
