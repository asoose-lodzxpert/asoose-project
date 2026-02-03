import { OrderStatus } from "@/types/order-types";
import { get } from "../lib/authFetch";

export async function fetchOrderHistory({
  page,
  pageSize,
  status,
}: {
  page: number;
  pageSize: number;
  status?: OrderStatus;
}): Promise<{
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (status) params.append("status", status);
  const url = `/users/orders?${params.toString()}`;
  return await get(url);
}

export async function fetchOrderById(orderId: string): Promise<any> {
  return await get(`/users/orders/${orderId}`);
}
