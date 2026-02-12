import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

export type StartupPermissionStatus = {
  location: Location.PermissionStatus | "unknown";
  camera: ImagePicker.PermissionStatus | "unknown";
  media: ImagePicker.PermissionStatus | "unknown";
  notifications: Notifications.PermissionStatus | "unknown";
};

export async function checkStartupPermissions(): Promise<StartupPermissionStatus> {
  const result: StartupPermissionStatus = {
    location: "unknown",
    camera: "unknown",
    media: "unknown",
    notifications: "unknown",
  };

  try {
    const loc = await Location.getForegroundPermissionsAsync();
    result.location = loc.status;
  } catch {}

  try {
    const cam = await ImagePicker.getCameraPermissionsAsync();
    result.camera = cam.status;
  } catch {}

  try {
    const media = await ImagePicker.getMediaLibraryPermissionsAsync();
    result.media = media.status;
  } catch {}

  try {
    const notif = await Notifications.getPermissionsAsync();
    result.notifications = notif.status;
  } catch {}

  return result;
}

/**
 * Only request permissions that are safe to ask at startup.
 * (Notifications is usually OK. Others should be requested when needed.)
 */
export async function requestStartupPermissions() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch (e) {
    if (__DEV__) {
      console.warn("Notification permission error:", e);
    }
  }
}
