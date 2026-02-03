import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

// Ensure handler is only set once
let isNotificationHandlerSet = false;

/**
 * Configure notification behavior for foreground notifications.
 * Call this once after RN initialization.
 */
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

/**
 * Register device with Expo push notifications and return the Expo push token.
 * Uses Expo Push service (getExpoPushTokenAsync) to avoid starting background
 * platform services directly.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  let token: string | undefined;

  if (Platform.OS === "android") {
    // Android channels (affect foreground behavior)
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("jobs", {
      name: "Job Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#FF6B46",
      sound: "default",
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync("payout", {
      name: "Payout Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: "#3AB795",
      sound: "default",
      enableVibrate: true,
    });
  }

  if (!Device.isDevice) return undefined;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return undefined;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e: any) {
    console.warn("Push notification registration failed:", e?.message ?? e);
    return undefined;
  }

  return token;
}

/** Save rider push token to backend. */
export async function savePushToken(token: string): Promise<void> {
  try {
    // Rider-specific endpoint
    await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/auth/rider/push-token`, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (error) {
    // Silently ignore to avoid crashing app
  }
}

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
