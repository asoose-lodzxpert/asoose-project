import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getDriverUpcomingRides(): Promise<any[]> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/scheduled-rides/driver/upcoming`,
    );
    return response;
  } catch (error) {
    console.error("Error fetching driver upcoming rides:", error);
    throw error;
  }
}

export async function driverCancelRide(rideId: string): Promise<any> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/scheduled-rides/${rideId}/driver-cancel`,
      { method: "PATCH" },
    );
    return response;
  } catch (error) {
    console.error("Error cancelling scheduled ride as driver:", error);
    throw error;
  }
}
