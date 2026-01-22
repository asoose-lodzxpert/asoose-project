import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface EarningsData {
  total: number;
  deliveries: number;
  avgPerDelivery: number;
  hoursOnline: number;
  rating: number;
  breakdown: {
    deliveryFees: number;
    bonuses: number;
    serviceFees: number;
  };
}

export type Timeframe = "today" | "week" | "month" | "year";

export async function getEarnings(
  timeframe: Timeframe = "week",
): Promise<EarningsData> {
  try {
    const data = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/earnings?timeframe=${timeframe}`,
    );
    return data;
  } catch (error) {
    console.error("Error fetching earnings:", error);
    throw error;
  }
}

export async function getWalletBalance(): Promise<{ balance: number }> {
  try {
    const data = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/wallet/balance`,
    );
    return data;
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    throw error;
  }
}
