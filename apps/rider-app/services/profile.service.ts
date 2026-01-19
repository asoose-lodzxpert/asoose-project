import { fetchWithAuth } from "./auth-fetch";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface RiderProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  image: string | null;
  role: "RIDER" | "DRIVER"; // Role to distinguish between rider and driver
  status: string;
  rating: number;
  totalRides: number;
  walletBalance: number;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
  vehicle?: {
    id: string;
    type: string;
    brand: string;
    model: string;
    plateNumber: string;
    color: string;
    year: number;
  } | null;
  documents?: Array<{
    id: string;
    type: string;
    url: string;
    status: string;
  }>;
  bankAccount?: {
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null;
}

export interface ProfileStats {
  totalDeliveries: number;
  hoursOnline: number;
  thisWeekDeliveries: number;
  rating: number;
}

export async function getRiderProfile(): Promise<RiderProfile> {
  try {
    const data = await fetchWithAuth(`${API_URL}/riders/me`);
    return data;
  } catch (error) {
    console.error("Error fetching rider profile:", error);
    throw error;
  }
}

export async function getProfileStats(): Promise<ProfileStats> {
  try {
    // Get current week's deliveries
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    const earningsData = await fetchWithAuth(
      `${API_URL}/riders/earnings?timeframe=week`
    );

    return {
      totalDeliveries: earningsData.deliveries || 0,
      hoursOnline: earningsData.hoursOnline || 0,
      thisWeekDeliveries: earningsData.deliveries || 0,
      rating: earningsData.rating || 5.0,
    };
  } catch (error) {
    console.error("Error fetching profile stats:", error);
    throw error;
  }
}

export async function updateRiderProfile(
  updates: Partial<RiderProfile>
): Promise<RiderProfile> {
  try {
    const data = await fetchWithAuth(`${API_URL}/riders/me`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return data;
  } catch (error) {
    console.error("Error updating rider profile:", error);
    throw error;
  }
}
