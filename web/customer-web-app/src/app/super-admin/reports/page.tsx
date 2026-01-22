'use client';

import React, { useState, useMemo } from 'react';
import { Download, Calendar, Loader2, Filter } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, parseISO } from 'date-fns';
import useSWR from 'swr'; 
import { getSession } from 'next-auth/react'; 
import { fetcher } from '../hooks/useSuperAdminFetch';
import OverviewCards from './component/overviewcards';
import ChartsSection from './component/chartsection';
import RevenueBreakdown from './component/revenuebreakdown';
import RatingsDistribution from './component/ratingdistribution';
import TopVendors from './component/topvendors';
import ReportsPageSkeleton from './component/skeleton';

// --- Types ---
interface API_ReportData {
  overview: any; // You can replace 'any' with 'OverviewMetrics' if you have the type
  orderVolume: any[];
  growth: any[];
  revenueBreakdown: any[];
  ratings: any[];
  avgRating: number;
  topVendors: any[];
}

const TIME_PERIODS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Last Year', value: 365 },
];

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

  const processedChartData = useMemo(() => {
    if (!data) return { volume: [], growth: [], granularity: 'Day' };

    let volumeData = [...data.orderVolume];
    let granularity = 'Day';

    // 1. If period > 30 days, Group by Week
    if (selectedPeriod > 30 && selectedPeriod <= 90) {
      granularity = 'Week';
      const weeklyMap = new Map();
      volumeData.forEach(d => {
        const weekStart = format(startOfWeek(parseISO(d.date)), 'MMM d');
        const prev = weeklyMap.get(weekStart) || { orders: 0, revenue: 0 };
        weeklyMap.set(weekStart, {
          orders: prev.orders + d.orders,
          revenue: prev.revenue + d.revenue
        });
      });
      volumeData = Array.from(weeklyMap.entries()).map(([date, val]) => ({ date, ...val }));
    } 
    // 2. If period > 90 days, Group by Month
    else if (selectedPeriod > 90) {
      granularity = 'Month';
      const monthlyMap = new Map();
      volumeData.forEach(d => {
        const monthStart = format(startOfMonth(parseISO(d.date)), 'MMM yyyy');
        const prev = monthlyMap.get(monthStart) || { orders: 0, revenue: 0 };
        monthlyMap.set(monthStart, {
          orders: prev.orders + d.orders,
          revenue: prev.revenue + d.revenue
        });
      });
      volumeData = Array.from(monthlyMap.entries()).map(([date, val]) => ({ date, ...val }));
    }

    return {
      granularity,
      volume: volumeData.map(d => ({
        name: granularity === 'Day' ? format(parseISO(d.date), 'MMM d') : d.date,
        orders: d.orders,
        revenue: d.revenue
      })),
      growth: data.growth.map(g => ({
        name: g.month,
        riders: g.riders,
        delivery: g.orders
      }))
    };
  }, [data, selectedPeriod]);

  // --- Comparison Text Logic ---
  const comparisonText = useMemo(() => {
    const end = new Date();
    const start = subDays(end, selectedPeriod);
    const prevStart = subDays(start, selectedPeriod);
    const prevEnd = subDays(end, selectedPeriod);
    
    return `vs ${format(prevStart, 'MMM d')} - ${format(prevEnd, 'MMM d')}`;
  }, [selectedPeriod]);

  // --- Export Handler ---
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
      a.download = `report-${selectedPeriod}d.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch(e) { 
        alert('Export failed'); 
    } finally { 
        setIsExporting(false); 
    }
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading && !data) return <ReportsPageSkeleton />;
  if (error) return <div className="p-10 text-center text-red-500">Failed to load analytics data.</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-[#0F172A]/95 backdrop-blur-md border-b border-gray-800 px-4 md:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400 text-xs md:text-sm">
              Overview for <span className="text-yellow-500 font-bold">{selectedPeriod} days</span> ending {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {/* Period Dropdown */}
            <div className="relative flex-1 md:flex-none">
              <button
                onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                className="w-full md:w-auto flex items-center justify-between gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 rounded-lg text-gray-300 hover:text-white text-sm font-medium"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {isCustomRange ? 'Custom Range' : TIME_PERIODS.find(p => p.value === selectedPeriod)?.label}
                </div>
              </button>
              
              {showPeriodMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1E293B] border border-gray-700 rounded-lg shadow-xl z-30 overflow-hidden">
                  {TIME_PERIODS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => { setSelectedPeriod(p.value); setIsCustomRange(false); setShowPeriodMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${selectedPeriod === p.value && !isCustomRange ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="border-t border-gray-700 my-1"></div>
                  <button 
                    onClick={() => { setIsCustomRange(true); setShowPeriodMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                     <Filter className="w-3 h-3" /> Custom Range
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 text-sm flex items-center gap-2 shadow-lg shadow-yellow-500/20"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden md:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6 mt-6">
        
        {/* Overview Cards */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
            {/* ✅ FIXED: Added null fallback */}
            <OverviewCards 
              metrics={data?.overview ?? null} 
              subtext={comparisonText} 
            />
        </div>

        {/* Charts */}
        <ChartsSection 
          volumeData={processedChartData.volume}
          growthData={processedChartData.growth}
          granularity={processedChartData.granularity}
        />

        {/* Breakdown & Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueBreakdown data={data.revenueBreakdown} />
          <RatingsDistribution ratings={data.ratings} avgRating={data.avgRating} />
          <TopVendors vendors={data.topVendors} />
        </div>
      </div>
    </div>
  );
}