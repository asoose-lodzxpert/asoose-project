import AsyncStorage from "@react-native-async-storage/async-storage";

const EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface DirectionsResponse {
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  error?: string;
}

export async function getDirections(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<DirectionsResponse> {
  try {
    // Get auth token
    const token = await AsyncStorage.getItem("access_token");

    const url = `${EXPO_PUBLIC_API_URL}/maps/directions?originLat=${origin.latitude}&originLng=${origin.longitude}&destLat=${destination.latitude}&destLng=${destination.longitude}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch directions");
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error("Error fetching directions:", error);
    return {
      coordinates: [],
      distance: { text: "", value: 0 },
      duration: { text: "", value: 0 },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
