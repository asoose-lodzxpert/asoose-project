export type OrderTab = "pending" | "active" | "history";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerProfile: string; // URL to profile image
  items: OrderItem[];
  total: number; // in NGN
  status: OrderTab; // current status
  countdown?: string; // e.g., "04:30 left" for pending/active
  deadline?: number; // Unix timestamp in milliseconds
}
