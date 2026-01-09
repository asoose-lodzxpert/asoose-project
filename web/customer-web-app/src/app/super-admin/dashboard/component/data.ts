export interface Stat {
  label: string;
  value: string;
  trend: 'up' | 'down';
  change: string;
  iconName: 'ShoppingCart' | 'Car' | 'Truck' | 'DollarSign';
  color: string;
  bgColor: string;
}

export interface Activity {
  id: string;
  type: 'order' | 'ride' | 'vendor' | 'delivery' | 'customer' | 'admin';
  event: string;
  entity: string;
  time: string;
  action: string;
}

export interface Alert {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  category: string;
  time: string;
  status: 'New' | 'Ack' | 'Resolved' | 'Investigating';
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
    bgColor: "bg-green-500/10"
  },
  {
    label: "Active Orders",
    value: "0",
    trend: "up",
    change: "0%",
    iconName: "ShoppingCart",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    label: "Active Riders",
    value: "0",
    trend: "down",
    change: "0%",
    iconName: "Car",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    label: "Pending Approvals",
    value: "0",
    trend: "up",
    change: "0",
    iconName: "Truck",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', type: 'order', event: 'New Order #ORD-001', entity: 'Joe\'s Pizza', time: '2 mins ago', action: 'View' },
  { id: '2', type: 'ride', event: 'Ride Requested', entity: 'User #992', time: '5 mins ago', action: 'Monitor' },
  { id: '3', type: 'vendor', event: 'Vendor Signup', entity: 'Burger King', time: '10 mins ago', action: 'Review' },
  { id: '4', type: 'delivery', event: 'Delivery Delayed', entity: 'Driver Mike', time: '15 mins ago', action: 'Track' },
  { id: '5', type: 'customer', event: 'Account Created', entity: 'Customer Alice', time: '30 mins ago', action: 'View' },
];

export const MOCK_ALERTS: Alert[] = [
  { id: '1', severity: 'HIGH', message: 'High volume of failed payments detected', category: 'Finance', time: '10m ago', status: 'New' },
  { id: '2', severity: 'MEDIUM', message: 'Rider supply low in Downtown area', category: 'Operations', time: '45m ago', status: 'New' },
  { id: '3', severity: 'LOW', message: 'System maintenance scheduled for tonight', category: 'System', time: '2h ago', status: 'Ack' },
];