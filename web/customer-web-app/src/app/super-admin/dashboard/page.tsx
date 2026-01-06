'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, Car, Truck, DollarSign, CheckCircle, 
  ShieldAlert, UserCheck, MessageSquare, FileText, 
  TrendingUp, TrendingDown, Loader2
} from 'lucide-react';
import { DataTable } from '@/app/super-admin/component/datatable';

import { MOCK_STATS,MOCK_ACTIVITIES,MOCK_ALERTS,Activity,Alert,Stat } from './component/data';
import { createActivityColumns,createAlertColumns,renderActivityMobileCard,renderAlertMobileCard } from './component/columns';

import SuperAdminDashboardSkeleton from './component/skeletom';
export default function SuperAdminDashboard() {
  const [activityRowSelection, setActivityRowSelection] = useState({});
  const [alertRowSelection, setAlertRowSelection] = useState({});
  
  // Data States
  const [stats, setStats] = useState<any[]>(MOCK_STATS);
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch Stats
        const statsRes = await fetch('/api/dashboard/stats');
        const statsData = statsRes.ok ? await statsRes.json() : MOCK_STATS;
        setStats(statsData);

        // Fetch Activities
        const activitiesRes = await fetch('/api/dashboard/activities');
        const activitiesData = activitiesRes.ok ? await activitiesRes.json() : MOCK_ACTIVITIES;
        setActivities(activitiesData);

        // Fetch Alerts
        const alertsRes = await fetch('/api/dashboard/alerts');
        const alertsData = alertsRes.ok ? await alertsRes.json() : MOCK_ALERTS;
        setAlerts(alertsData);

      } catch (error) {
        console.error("Dashboard data fetch failed:", error);
        // Fallbacks already set in initial state, but explicit for safety
        setStats(MOCK_STATS);
        setActivities(MOCK_ACTIVITIES);
        setAlerts(MOCK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- Column Definitions ---
  const activityColumns = useMemo(() => createActivityColumns(), []);
  
  // Pass an action handler to alerts (e.g., resolve alert)
  const alertColumns = useMemo(() => createAlertColumns({
    onResolve: (id) => console.log('Resolve alert:', id) // Replace with API call logic
  }), []);

  // --- Icon Mapper for Stats ---
  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'ShoppingCart': return ShoppingCart;
      case 'Car': return Car;
      case 'Truck': return Truck;
      case 'DollarSign': return DollarSign;
      default: return ShoppingCart;
    }
  }

  if (isLoading) {
    return <SuperAdminDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">System Overview</h1>
            <p className="text-gray-400 text-sm mt-1">Real-time platform performance monitoring</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors">
              Generate Report
            </button>
          </div>
        </div>

        {/* 2. Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = getIcon(stat.iconName);
            return (
              <div key={i} className="bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800 shadow-sm relative overflow-hidden group hover:border-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-gray-400 text-xs uppercase font-bold">{stat.label}</p>
                    <h3 className="text-2xl md:text-3xl font-black mt-1 text-white">{stat.value}</h3>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                    {stat.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </span>
                  <span className="text-gray-500">vs last period</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Real-time Activity Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="font-bold text-lg text-white">Real-time Activity</h2>
            <Link href="/super-admin/activity-logs" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View All Logs
            </Link>
          </div>
          
          <div className="flex-1 min-h-0">
            <DataTable
              data={activities}
              columns={activityColumns}
              rowSelection={activityRowSelection}
              onRowSelectionChange={setActivityRowSelection}
              pageSize={5}
              renderMobileCard={renderActivityMobileCard}
            />
          </div>
        </div>

        {/* 4. System Health & Alerts */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">System Health & Alerts</h2>
          
          {/* Status Indicators */}
          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm font-bold">
              <CheckCircle className="w-4 h-4" /> API Status: Operational
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm font-bold">
              <CheckCircle className="w-4 h-4" /> Payment Gateway: Operational
            </div>
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-blue-400 text-sm font-bold">
              <CheckCircle className="w-4 h-4" /> Service Outages: None
            </div>
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2 text-purple-400 text-sm font-bold">
              <UserCheck className="w-4 h-4" /> Active Users: 2,458
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-red-500/5 flex justify-between items-center">
              <h3 className="font-bold text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Critical Alerts
              </h3>
              <span className="text-xs text-gray-400">{alerts.filter(a => a.severity === 'HIGH').length} High Priority</span>
            </div>
            
            <div className="flex-1 min-h-0">
              <DataTable
                data={alerts}
                columns={alertColumns}
                rowSelection={alertRowSelection}
                onRowSelectionChange={setAlertRowSelection}
                pageSize={5}
                renderMobileCard={renderAlertMobileCard}
              />
            </div>
          </div>
        </div>

        {/* 5. Quick Access Cards (Bottom Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-4">
          
          <div className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 hover:border-yellow-500/50 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-gray-200">Pending Approvals</h4>
                <div className="text-2xl md:text-3xl font-black text-yellow-500 my-2">7</div>
                <p className="text-xs text-gray-400">5 Riders, 2 Vendors awaiting review</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <Link href="/super-admin/approvals">
              <button className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-sm transition-colors">
                Review Now
              </button>
            </Link>
          </div>

          <div className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 hover:border-orange-500/50 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-gray-200">Open Disputes</h4>
                <div className="text-2xl md:text-3xl font-black text-orange-500 my-2">12</div>
                <p className="text-xs text-gray-400">Disputes requiring attention</p>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <Link href="/super-admin/disputes">
              <button className="w-full py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-lg text-sm transition-colors">
                View Disputes
              </button>
            </Link>
          </div>

          <div className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-gray-200">Revenue Report</h4>
                <p className="text-xs text-gray-400 mt-1 mb-3">Last 7 Days overview</p>
                <div className="text-lg font-bold text-green-400">+12.5% growth</div>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <Link href="/super-admin/reports/revenue">
              <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors">
                View Report
              </button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}