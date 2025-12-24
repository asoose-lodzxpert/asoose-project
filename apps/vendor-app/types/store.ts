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
  timestamp: string; // e.g., "5 min ago"
}
