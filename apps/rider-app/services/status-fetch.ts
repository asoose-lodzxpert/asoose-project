import { fetchWithAuth } from "@/services/auth-fetch";

export async function fetchRealtimeOnlineStatus(): Promise<{
  isOnline: boolean;
  status: "ONLINE" | "OFFLINE";
}> {
  try {
    const response = await fetchWithAuth(
      `${process.env.EXPO_PUBLIC_API_URL}/rider/status/me`,
    );
    return response;
  } catch (error) {
    console.error("[Status] Error fetching realtime status:", error);
    // Default to offline if unable to fetch
    return { isOnline: false, status: "OFFLINE" };
  }
}
