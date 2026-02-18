import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface VehicleInfo {
  id: string;
  type: string;
  brand: string;
  model: string;
  plateNumber: string;
  color: string;
  year: number;
}

export async function getVehicleInfo(): Promise<VehicleInfo | null> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/profile/me`,
    );
    return response.vehicle || null;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch vehicle info",
    );
  }
}
