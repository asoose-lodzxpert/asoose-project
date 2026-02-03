import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface EarningsData {
  total: number;
  rides: number;
  avgPerRide: number;
  hoursOnline: number;
  rating: number;
  breakdown: {
    rideFees: number;
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
