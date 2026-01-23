import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export type OrderStatus =
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface CombinedOrder {
  id: string;
  type: "ride" | "delivery";
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerImage: string | null;
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLocation: string;
  dropoffLat?: number;
  dropoffLng?: number;
  totalAmount: number;
  distance?: number;
  duration?: number;
  status: OrderStatus;
  createdAt: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  orderId?: string;
  storeName?: string;
  storeAddress?: string;
}

export interface OrdersResponse {
  data: CombinedOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch all orders (rides + deliveries) combined and sorted by newest first
 */
export async function getAllOrders(
  status?: string,
  page: number = 1,
  limit: number = 20,
): Promise<OrdersResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append("status", status);
    }

    const data = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/orders/history?${params}`,
    );
    return data;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
}
