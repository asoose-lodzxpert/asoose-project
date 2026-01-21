import { fetchWithAuth } from "./auth-fetch";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface RiderStatusUpdate {
  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
}

export interface AcceptDeliveryParams {
  deliveryId: string;
  currentLat?: number;
  currentLng?: number;
}

export interface CompleteDeliveryParams {
  deliveryId: string;
  deliveryProof?: string;
  deliveryOtp?: string;
}

export const riderApiService = {
  async updateStatus(data: RiderStatusUpdate) {
    const response = await fetchWithAuth(`${API_URL}/riders/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response;
  },

  async getActiveDelivery() {
    const response = await fetchWithAuth(`${API_URL}/riders/deliveries/active`);
    return response;
  },

  async acceptDelivery(data: AcceptDeliveryParams) {
    const response = await fetchWithAuth(
      `${API_URL}/riders/deliveries/accept`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return response;
  },

  async confirmPickup(deliveryId: string) {
    const response = await fetchWithAuth(
      `${API_URL}/riders/deliveries/${deliveryId}/pickup`,
      {
        method: "PATCH",
      },
    );
    return response;
  },

  async completeDelivery(data: CompleteDeliveryParams) {
    const response = await fetchWithAuth(
      `${API_URL}/riders/deliveries/complete`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return response;
  },

  async getEarningsStats(timeframe: string = "week") {
    const response = await fetchWithAuth(
      `${API_URL}/riders/earnings?timeframe=${timeframe}`,
    );
    return response;
  },
};
