import { OrderStatus } from "@/types/order-types";
import { get } from "../lib/authFetch";

export async function fetchOrderHistory(status?: OrderStatus): Promise<any[]> {
  const url = status ? `/orders?status=${status}` : "/orders";
  return await get(url);
}

export async function fetchOrderById(orderId: string): Promise<any> {
  return await get(`/orders/${orderId}`);
}
