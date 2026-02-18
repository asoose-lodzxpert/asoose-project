import { request } from "@/lib/authFetch";

// Align with backend CreateOrderDto
export type CreateOrderPayload = {
  addressId: string;
  storeId?: string; // Optional - backend will auto-detect multi-vendor
  items: {
    id: string; // product id
    quantity: number;
  }[];
};

export type Order = {
  id: string;
  storeId: string;
  userId: string;
  status: string;
  total: number;
  deliveryFee: number;
  subtotal: number;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: number;
  }[];
};

export type OrderGroup = {
  id: string;
  orderGroupId?: string; // For multi-vendor orders
  orders?: Order[]; // Array of orders for multi-vendor
  userId: string;
  totalAmount: number;
  grandTotal: number;
  paymentStatus: string;
  createdAt: string;
};

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<Order | OrderGroup> {
  return request("/users/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUserOrders(): Promise<Order[]> {
  return request("/users/orders", {
    method: "GET",
  });
}

export async function getOrderById(orderId: string): Promise<Order> {
  return request(`marketplace/orders/${orderId}`, {
    method: "GET",
  });
}
