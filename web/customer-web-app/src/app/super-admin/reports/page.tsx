'use client';

import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2 } from 'lucide-react';

import { MOCK_REPORT_DATA,ReportData } from './component/data';
import OverviewCards from './component/overviewcards';
import ChartsSection from './component/chartsection';
import RevenueBreakdown from './component/revenuebreakdown';
import RatingsDistribution from './component/ratingdistribution';
import TopVendors from './component/topvendors';
import ReportsPageSkeleton from './component/skeleton';

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>(MOCK_REPORT_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch Logic ---
  useEffect(() => {

    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/reports/analytics');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          console.warn("API unavailable, using mock data");
          setData(MOCK_REPORT_DATA);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
        setData(MOCK_REPORT_DATA);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (isLoading) {
    return (
     <ReportsPageSkeleton/>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          </div>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors text-sm font-medium">
                <Calendar className="w-4 h-4" /> Last 30 Days
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10 text-sm">
                <Download className="w-4 h-4" /> Export All
             </button>
          </div>
        </div>

        {/* 2. Overview Cards */}
        <OverviewCards metrics={data.overview} />

        {/* 3. Performance Trends (Charts) */}
        <ChartsSection 
          orderVolumeData={data.orderVolume} 
          growthData={data.growth} 
        />

        {/* 4. Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <RevenueBreakdown data={data.revenueBreakdown} />
           <RatingsDistribution ratings={data.ratings} avgRating={data.avgRating} />
           <TopVendors vendors={data.topVendors} />
        </div>

      </div>
    </div>
  );
}