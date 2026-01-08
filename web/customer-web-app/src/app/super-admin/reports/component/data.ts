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

