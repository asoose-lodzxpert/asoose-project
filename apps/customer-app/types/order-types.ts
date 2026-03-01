export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  DISPATCHED = "DISPATCHED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export type SubOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  storeName?: string;
  storeLogo?: string | null;
  items: Array<{ name: string; quantity: number }>;
};

export type Order = {
  type: "ORDER" | "GROUP";
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  total: number;
  paymentStatus?: string;
  paymentMethod?: string;
  // Single order fields
  storeName?: string;
  storeLogo?: string | null;
  // Group order fields
  orderCount?: number;
  stores?: string[];
  orders?: SubOrder[];
  items: Array<{ name: string; quantity: number }>;
  [key: string]: any;
};
