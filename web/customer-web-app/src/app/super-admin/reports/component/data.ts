import { DollarSign, ShoppingBag, Users, UserPlus } from 'lucide-react';

export interface OverviewMetric {
  label: string;
  value: string;
  change: string;
  iconName: 'DollarSign' | 'ShoppingBag' | 'Users' | 'UserPlus';
  color: string;
  bg: string;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface VendorMetric {
  name: string;
  revenue: string;
  change: string;
}

export interface ReportData {
  overview: OverviewMetric[];
  orderVolume: ChartDataPoint[];
  growth: ChartDataPoint[];
  revenueBreakdown: { label: string; val: number; color: string }[];
  ratings: { star: number; percentage: number }[];
  avgRating: number;
  topVendors: VendorMetric[];
}

// Fallback Data
export const MOCK_REPORT_DATA: ReportData = {
  overview: [
    { label: 'Total Revenue', value: '$125,400', change: '+15%', iconName: 'DollarSign', color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Total Orders', value: '8,750', change: '+12%', iconName: 'ShoppingBag', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Users', value: '3,200', change: '+5%', iconName: 'Users', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'New Signups', value: '450', change: '+20%', iconName: 'UserPlus', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ],
orderVolume: [
    { name: 'Day 1', food: 650, grocery: 400 }, 
    { name: 'Day 2', food: 400, grocery: 300 },
    { name: 'Day 3', food: 750, grocery: 500 },
    { name: 'Day 4', food: 550, grocery: 350 },
    { name: 'Day 5', food: 800, grocery: 600 },
    { name: 'Day 6', food: 450, grocery: 280 },
    { name: 'Day 7', food: 900, grocery: 700 },
  ],
  growth: [
    { name: 'Jan', rides: 400, delivery: 240 }, 
    { name: 'Feb', rides: 300, delivery: 198 },
    { name: 'Mar', rides: 500, delivery: 320 },
    { name: 'Apr', rides: 780, delivery: 508 },
    { name: 'May', rides: 590, delivery: 400 },
    { name: 'Jun', rides: 800, delivery: 580 },
  ],

  revenueBreakdown: [
    { label: 'Food Delivery', val: 45, color: 'bg-green-500' },
    { label: 'Ride Hailing', val: 30, color: 'bg-yellow-500' },
    { label: 'Grocery', val: 15, color: 'bg-blue-500' },
    { label: 'Package Delivery', val: 10, color: 'bg-purple-500' },
  ],
  ratings: [
    { star: 5, percentage: 60 },
    { star: 4, percentage: 25 },
    { star: 3, percentage: 10 },
    { star: 2, percentage: 3 },
    { star: 1, percentage: 2 },
  ],
  avgRating: 4.8,
  topVendors: [
    { name: "Joe's Pizza", revenue: '$45,230', change: '+12%' },
    { name: "Tech Gadgets", revenue: '$38,120', change: '+8%' },
    { name: "Fashion Hub", revenue: '$22,450', change: '+5%' },
    { name: "FreshMart", revenue: '$18,300', change: '+15%' },
    { name: "Burger King", revenue: '$12,100', change: '+2%' },
  ]
};