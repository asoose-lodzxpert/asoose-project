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
    // ... (Your channel code remains the same)
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

    if (!projectId) throw new Error("Project ID is missing from Expo config");

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e: any) {
    showToast("Failed to initialize notifications.");
    await logErrorToBackend("registerForPushNotificationsAsync", e);
    return undefined;
  }

  return token;
}

export async function savePushToken(token: string): Promise<void> {
  try {
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/auth/rider/push-token`, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (error: any) {
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
