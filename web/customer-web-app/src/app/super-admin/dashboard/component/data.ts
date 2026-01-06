// src/app/super-admin/dashboard/types.ts
import { ShoppingCart, Car, Truck, DollarSign } from 'lucide-react';

export interface Activity {
  id: string;
  time: string;
  event: string;
  entity: string;
  action: string;
  type: 'order' | 'ride' | 'vendor' | 'delivery' | 'customer';
}

export interface Alert {
  id: string;
  severity: string;
  message: string;
  time: string;
  status: string;
  category: string;
}

export interface Stat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  iconName: 'ShoppingCart' | 'Car' | 'Truck' | 'DollarSign'; // Store as string for easy serialization
  color: string;
  bgColor: string;
}

// Fallback Mock Data
export const MOCK_STATS = [
  { label: 'Total Orders (24h)', value: '1,245', change: '+8%', trend: 'up', iconName: 'ShoppingCart', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { label: 'Active Rides', value: '128', change: '+5%', trend: 'up', iconName: 'Car', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { label: 'Ongoing Deliveries', value: '203', change: '-2%', trend: 'down', iconName: 'Truck', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { label: 'Total Revenue (Today)', value: '$15,230', change: '+12%', trend: 'up', iconName: 'DollarSign', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 'ACT-001', time: 'Just now', event: 'New Order #ORD-58789 (Food)', entity: 'Customer John D.', action: 'View Order', type: 'order' },
  { id: 'ACT-002', time: '5s ago', event: 'Ride #RID-12345 Completed', entity: 'Driver Sarah J.', action: 'View Ride', type: 'ride' },
  { id: 'ACT-003', time: '15s ago', event: 'Vendor "Pizza Place" Online', entity: 'Vendor ID: #VEN-001', action: 'View Vendor', type: 'vendor' },
  { id: 'ACT-004', time: '30s ago', event: 'Delivery #DEL-98765 Picked Up', entity: 'Rider Marcus R.', action: 'View Delivery', type: 'delivery' },
  { id: 'ACT-005', time: '1m ago', event: 'New Customer Account', entity: 'Customer Jane S.', action: 'View Customer', type: 'customer' },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'ALT-001', severity: 'HIGH', message: 'Rider GPS signal lost (#DRV-901)', time: '5 min ago', status: 'New', category: 'Location' },
  { id: 'ALT-002', severity: 'MEDIUM', message: 'Vendor "Grocery Mart" offline for 2h', time: '15 min ago', status: 'New', category: 'Vendor' },
  { id: 'ALT-003', severity: 'HIGH', message: 'Payment gateway failed transaction (#TRN-11221)', time: '30 min ago', status: 'New', category: 'Payment' },
];