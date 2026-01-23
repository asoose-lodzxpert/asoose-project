'use client';

import React, { useState, useMemo } from 'react';
import { Download, Calendar, Loader2, Filter } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, parseISO } from 'date-fns';
import useSWR from 'swr'; 
import { getSession } from 'next-auth/react'; 
import { fetcher } from '../hooks/useSuperAdminFetch';
import OverviewCards, { OverviewMetric } from './component/overviewcards';
import ChartsSection from './component/chartsection';
import RevenueBreakdown from './component/revenuebreakdown';
import RatingsDistribution from './component/ratingdistribution';
import TopVendors from './component/topvendors';
import ReportsPageSkeleton from './component/skeleton';

// ===========================================================================
//  TYPES (Synchronized with Backend AnalyticsReport DTO)
// ===========================================================================

interface API_ReportData {
  overview: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    activeStores: number;
    storesChange: number;
    avgOrderValue: number;
    avgOrderValueChange: number;
  };
  orderVolume: { date: string; orders: number; revenue: number }[];
  growth: { month: string; stores: number; orders: number; riders: number }[];
  revenueBreakdown: { category: string; amount: number; percentage: number; change: number }[];
  ratings: { star: number; count: number; percentage: number }[];
  avgRating: number;
  topVendors: { id: string; name: string; revenue: number; orders: number; rating: number; change: number }[];
}

const TIME_PERIODS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Last Year', value: 365 },
];

// ===========================================================================
//  MAIN COMPONENT
// ===========================================================================

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, error, isLoading } = useSWR<API_ReportData>(
    `/super-admin/reports/analytics?days=${selectedPeriod}`,
    fetcher,
    {
      keepPreviousData: true, 
      revalidateOnFocus: false, 
      refreshInterval: 0, 
    }
  );

  /**
   * ✅ CURRENCY FORMATTER (Naira ₦)
   */
  const formatNGN = (val: number) => 
    new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: 'NGN', 
      maximumFractionDigits: 0 // Removes decimals for dashboard overview
    }).format(val);

  /**
   * ✅ FIX: Transform Backend Object to OverviewMetric Array
   * This solves the "metrics.map is not a function" error and handles the 
   * "trend" type mismatch.
   */
  const transformedMetrics = useMemo((): OverviewMetric[] | null => {
    if (!data?.overview) return null;

    const ov = data.overview;

    return [
      {
        label: 'Total Revenue',
        value: formatNGN(ov.totalRevenue),
        change: ov.revenueChange,
        trend: (ov.revenueChange > 0 ? 'up' : ov.revenueChange < 0 ? 'down' : 'neutral') as "up" | "down" | "neutral"
      },
      {
        label: 'Total Orders',
        value: ov.totalOrders.toLocaleString(),
        change: ov.ordersChange,
        trend: (ov.ordersChange > 0 ? 'up' : ov.ordersChange < 0 ? 'down' : 'neutral') as "up" | "down" | "neutral"
      },
      {
        label: 'Active Stores',
        value: ov.activeStores.toLocaleString(),
        change: ov.storesChange,
        trend: (ov.storesChange > 0 ? 'up' : ov.storesChange < 0 ? 'down' : 'neutral') as "up" | "down" | "neutral"
      },
      {
        label: 'Avg Order Value',
        value: formatNGN(ov.avgOrderValue),
        change: ov.avgOrderValueChange,
        trend: (ov.avgOrderValueChange > 0 ? 'up' : ov.avgOrderValueChange < 0 ? 'down' : 'neutral') as "up" | "down" | "neutral"
      }
    ];
  }, [data]);

  /**
   * ✅ FORMAT DATA FOR SUB-COMPONENTS (Currencies to strings where needed)
   */
  const formattedTopVendors = useMemo(() => {
    return data?.topVendors.map(v => ({
      ...v,
      revenue: formatNGN(v.revenue),
      change: `${v.change > 0 ? '+' : ''}${v.change}%`
    })) ?? [];
  }, [data]);

  const processedChartData = useMemo(() => {
    if (!data) return { volume: [], growth: [], granularity: 'Day' };

    let volumeData = [...data.orderVolume];
    let granularity = 'Day';

    if (selectedPeriod > 30 && selectedPeriod <= 90) {
      granularity = 'Week';
      const weeklyMap = new Map();
      volumeData.forEach(d => {
        const weekStart = format(startOfWeek(parseISO(d.date)), 'MMM d');
        const prev = weeklyMap.get(weekStart) || { orders: 0, revenue: 0 };
        weeklyMap.set(weekStart, { orders: prev.orders + d.orders, revenue: prev.revenue + d.revenue });
      });
      volumeData = Array.from(weeklyMap.entries()).map(([date, val]) => ({ date, ...val }));
    } else if (selectedPeriod > 90) {
      granularity = 'Month';
      const monthlyMap = new Map();
      volumeData.forEach(d => {
        const monthStart = format(startOfMonth(parseISO(d.date)), 'MMM yyyy');
        const prev = monthlyMap.get(monthStart) || { orders: 0, revenue: 0 };
        monthlyMap.set(monthStart, { orders: prev.orders + d.orders, revenue: prev.revenue + d.revenue });
      });
      volumeData = Array.from(monthlyMap.entries()).map(([date, val]) => ({ date, ...val }));
    }

    return {
      granularity,
      volume: volumeData.map(d => ({
        name: granularity === 'Day' ? format(parseISO(d.date), 'MMM d') : d.date,
        orders: d.orders,
        revenue: d.revenue // Numbers passed for Charting engine
      })),
      growth: data.growth.map(g => ({
        name: g.month,
        riders: g.riders,
        delivery: g.orders
      }))
    };
  }, [data, selectedPeriod]);

  const comparisonText = useMemo(() => {
    const end = new Date();
    const prevEnd = subDays(end, selectedPeriod);
    const prevStart = subDays(prevEnd, selectedPeriod);
    return `vs ${format(prevStart, 'MMM d')} - ${format(prevEnd, 'MMM d')}`;
  }, [selectedPeriod]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/super-admin/reports/export?days=${selectedPeriod}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${selectedPeriod}d.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch(e) { 
        alert('Export failed'); 
    } finally { 
        setIsExporting(false); 
    }
  };

  if (isLoading && !data) return <ReportsPageSkeleton />;
  if (error) return <div className="p-10 text-center text-red-500">Failed to load analytics data.</div>;

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20">
      
      <div className="sticky top-0 z-20 bg-[#0F172A]/95 backdrop-blur-md border-b border-gray-800 px-4 md:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white ">System Analytics</h1>
            <p className="text-gray-500 text-xs md:text-sm font-medium">
              Data overview for <span className="text-blue-500 font-bold">{selectedPeriod} days</span> ending {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <button
                onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                className="w-full md:w-auto flex items-center justify-between gap-2 px-4 py-2 bg-[#1E293B] border border-slate-800 rounded-xl text-gray-300 hover:text-white text-sm font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {TIME_PERIODS.find(p => p.value === selectedPeriod)?.label}
                </div>
              </button>
              
              {showPeriodMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1E293B] border border-slate-800 rounded-xl shadow-2xl z-30 overflow-hidden">
                  {TIME_PERIODS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => { setSelectedPeriod(p.value); setShowPeriodMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${selectedPeriod === p.value ? 'text-blue-500 bg-blue-500/10 font-bold' : 'text-gray-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 text-[10px] flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6 mt-6">
        
        {/* Overview Cards (Transformed Naira Array) */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
            <OverviewCards 
              metrics={transformedMetrics} 
              subtext={comparisonText} 
            />
        </div>

        {/* Analytics Charts */}
        <ChartsSection 
          volumeData={processedChartData.volume}
          growthData={processedChartData.growth}
          granularity={processedChartData.granularity}
        />

        {/* Breakdown & Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categorical Revenue Breakdown */}
          <RevenueBreakdown 
            data={data?.revenueBreakdown.map(item => ({
              ...item,
              amount: formatNGN(item.amount) // Format kobo in specific list
            })) ?? []} 
          />
          
          <RatingsDistribution 
            ratings={data?.ratings ?? []} 
            avgRating={data?.avgRating ?? 0} 
          />
          
          {/* Top Performing Vendors */}
          <TopVendors vendors={formattedTopVendors} />
        </div>
      </div>
    </div>
  );
}