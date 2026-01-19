import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { fetchWithAuth } from "./auth-fetch";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Configure notification behavior
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

// Request permissions and get push token
export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  let token;

  if (Platform.OS === "android") {
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
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e: any) {
      // Silently fail if Firebase is not configured
      // This is common in development or if FCM credentials are not set up
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
    await fetchWithAuth(`${API_URL}/auth/vendor/push-token`, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (error) {
    // Silent error handling
  }
}

// Remove push token (on logout)
export async function removePushToken(): Promise<void> {
  try {
    await fetchWithAuth(`${API_URL}/auth/vendor/push-token`, {
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
