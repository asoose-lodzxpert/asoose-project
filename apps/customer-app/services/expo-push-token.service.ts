import * as Notifications from "expo-notifications";
import { getAccessToken } from "./auth.service";

import { API_BASE } from "@/constants/static-config";

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function sendExpoPushTokenToBackend(token: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  await fetch(`${API_BASE}/users/expo-push-token`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ expoPushToken: token }),
  });
}

export async function deleteExpoPushTokenFromBackend() {
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  await fetch(`${API_BASE}/users/expo-push-token`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
