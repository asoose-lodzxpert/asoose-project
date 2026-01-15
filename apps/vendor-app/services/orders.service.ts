import { fetchWithAuth } from "./auth-fetch";

export interface OrderItem {
  id: string;
  productId: string;
  nameSnap: string;
  quantity: number;
  priceSnap: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerProfile?: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED"
    | "REJECTED";
  specialInstructions?: string;
  createdAt: string;
  deliveryAddress?: string;
}

export interface OrdersResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function fetchOrders(
  status: "pending" | "active" | "history",
  page: number = 1
): Promise<OrdersResponse> {
  const statusMap = {
    pending: "PENDING",
    active: "CONFIRMED,PREPARING,READY",
    history: "DELIVERED,CANCELLED,REJECTED",
  };

  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders?status=${statusMap[status]}&page=${page}&limit=20`
  );
}

export async function acceptOrder(orderId: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/accept`,
    {
      method: "PATCH",
    }
  );
}

export async function declineOrder(orderId: string, reason: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/decline`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }
  );
}

export async function markAsPreparing(orderId: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/preparing`,
    {
      method: "PATCH",
    }
  );
}

export async function markAsReady(orderId: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/ready`,
    {
      method: "PATCH",
    }
  );
}
