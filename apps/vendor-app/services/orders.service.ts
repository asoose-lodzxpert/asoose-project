import { fetchWithAuth } from "./auth-fetch";

export interface OrderItem {
  id: string;
  productId: string;
  nameSnap: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user: {
    name: string;
    image: string;
    phone: string;
  };
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
  page: number = 1,
): Promise<OrdersResponse> {
  const statusMap = {
    pending: "PENDING",
    active: "CONFIRMED,PREPARING,READY",
    history: "DELIVERED,CANCELLED,REJECTED",
  };

  const resp = await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders?status=${statusMap[status]}&page=${page}&limit=20`,
  );

  try {

    if (resp && Array.isArray(resp.data)) {
      resp.data = resp.data.map((order: any) => {
        const items = Array.isArray(order.items)
          ? order.items.map((it: any) => {
              const price = Number(it.price);
              const quantity = Number(it.quantity);

              return {
                ...it,
                price: Number.isFinite(price) ? price : 0,
                quantity: Number.isFinite(quantity) ? quantity : 0,
              };
            })
          : [];

        const computedTotal = items.reduce(
          (s: number, i: any) =>
            s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
          0,
        );

        return {
          ...order,
          items,
          total: computedTotal,
        };
      });
    }
  } catch (e) {
    // If normalization fails, return original response and let UI handle it.
  }

  return resp;
}

export async function acceptOrder(orderId: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/accept`,
    {
      method: "PATCH",
    },
  );
}

export async function declineOrder(orderId: string, reason: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/decline`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function markAsPreparing(orderId: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/preparing`,
    {
      method: "PATCH",
    },
  );
}

export async function markAsReady(orderId: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/ready`,
    {
      method: "PATCH",
    },
  );
}
