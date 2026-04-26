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

/** Driver formally accepts an assigned scheduled ride and moves it into the live flow. */
export async function acceptScheduledRide(rideId: string): Promise<any> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/scheduled-rides/${rideId}/accept`,
      { method: "PATCH" },
    );
    return response;
  } catch (error) {
    console.error("Error accepting scheduled ride:", error);
    throw error;
  }
}
