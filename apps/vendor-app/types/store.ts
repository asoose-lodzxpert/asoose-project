export interface StoreMetrics {
  todaysOrders: number;
  todaysSales: number; // in Naira
  pendingApprovals: number;
  avgRating: number; // percentage
}

export interface StoreOrder {
  id: string;
  customerName: string;
  customerProfile: string; // URL to profile image
  items: { id: string; name: string; quantity: number }[];
  total: number; // Naira
  status: "pending" | "accepted";
  timestamp: string; // ISO date string, e.g., "2026-03-10T08:18:55.753Z"
}
