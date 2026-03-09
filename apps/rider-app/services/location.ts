import * as Location from "expo-location";

/**
 * Wraps getCurrentPositionAsync with a timeout and accuracy fallback.
 *
 * GPS (High/Balanced) can hang indefinitely indoors or on emulators.
 * Strategy:
 *   1. Try Balanced accuracy with a 5-second timeout.
 *   2. If it times out, fall back to Low accuracy (network-only) with 5 s.
 *   3. If that also fails, fall back to Lowest accuracy.
 */
async function getPositionWithFallback(): Promise<Location.LocationObject> {
  const withTimeout = (promise: Promise<Location.LocationObject>, ms: number) =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ms),
      ),
    ]);

  const accuracyLevels = [
    Location.Accuracy.Balanced,
    Location.Accuracy.Low,
    Location.Accuracy.Lowest,
  ];

  for (const accuracy of accuracyLevels) {
    try {
      return await withTimeout(
        Location.getCurrentPositionAsync({ accuracy }),
        5000,
      );
    } catch {
      // try next lower accuracy
    }
  }

  throw new Error("Could not obtain location at any accuracy level");
}

export async function getCurrentCoords() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await getPositionWithFallback();
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch {
    return null;
  }
}
