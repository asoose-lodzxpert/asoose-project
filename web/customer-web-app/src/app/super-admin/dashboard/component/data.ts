export interface Stat {
  label: string;
  value: string;
  trend: "up" | "down";
  change: string;
  iconName: "ShoppingCart" | "Car" | "Truck" | "DollarSign";
  color: string;
  bgColor: string;
}

export interface Activity {
  id: string;
  type: "order" | "ride" | "vendor" | "delivery" | "customer" | "admin";
  event: string;
  entity: string;
  time: string;
  action: string;
  entityId: string;
  entityType: string;
}

export interface Alert {
  id: string;
  entityId: string; // Added: for deep-linking
  entityType: string; // Added: for routing (e.g., 'disputes' or 'verification')
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  category: string;
  time: string;
  status: "New" | "Ack" | "Resolved" | "Investigating";
}

// --- MOCK DATA ---

export const MOCK_STATS: Stat[] = [
  {
    label: "Total Revenue",
    value: "$0.00",
    trend: "up",
    change: "0%",
    iconName: "DollarSign",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Active Orders",
    value: "0",
    trend: "up",
    change: "0%",
    iconName: "ShoppingCart",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Active Riders",
    value: "0",
    trend: "down",
    change: "0%",
    iconName: "Car",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    label: "Pending Approvals",
    value: "0",
    trend: "up",
    change: "0",
    iconName: "Truck",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];
