"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ShoppingCart,
  DollarSign,
  CheckCircle,
  ShieldAlert,
  UserCheck,
  MessageSquare,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Download,
  Zap,
  RefreshCw,
  Truck,
} from "lucide-react";
import { DataTable } from "@/app/super-admin/component/datatable";

import { fetcher } from "../hooks/useSuperAdminFetch";
import {
  createActivityColumns,
  createAlertColumns,
  renderActivityMobileCard,
  renderAlertMobileCard,
} from "./component/columns";
import SuperAdminDashboardSkeleton from "./component/skeletom";

// --- Types (Matching Backend) ---
interface SelectedCardState {
  [key: string]: boolean;
}

interface StatCard {
  label: string;
  value: string;
  trend: "up" | "down";
  change: string;
  iconName: string;
  color: string;
  bgColor: string;
}

interface QuickAccessStats {
  approvals: { total: number; details: string };
  disputes: { total: number; details: string };
  revenue: { growth: string; details: string; isPositive: boolean };
}

interface TrendingMetrics {
  ordersWeekly: number;
  revenueWeekly: number;
  isAccelerating: boolean;
  criticalAlerts: number;
}

interface DashboardActivity {
  id: string;
  type: "order" | "ride" | "vendor" | "delivery" | "customer" | "admin";
  event: string;
  entity: string;
  entityId: string;
  entityType:
    | "orders"
    | "rides"
    | "deliveries"
    | "users/vendors"
    | "users/customers"
    | "admin";
  time: string;
  action: string;
}

interface DashboardAlert {
  id: string;
  entityId: string;
  entityType: "disputes" | "verification";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  category: string;
  time: string;
  status: "New" | "Ack" | "Resolved" | "Investigating";
}

// API Response Interface
interface StatsResponse {
  stats: StatCard[];
  quickAccess: QuickAccessStats;
  trending?: TrendingMetrics;
}

export default function SuperAdminDashboard() {
  const [activityRowSelection, setActivityRowSelection] = useState({});
  const [alertRowSelection, setAlertRowSelection] = useState({});
  const [selectedCards, setSelectedCards] = useState<SelectedCardState>({});
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // ===========================================================================
  //  ✅ SWR CONFIGURATION & DATA FETCHING
  // ===========================================================================

  const swrConfig = {
    refreshInterval: 120000, // Auto-refresh every 2 minutes
    revalidateOnFocus: true, // Refresh when window gains focus
    shouldRetryOnError: false, // Let our fetcher handle retries/auth
  };

  // 1. Fetch Stats & Quick Access
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR<StatsResponse>("/super-admin/dashboard/stats", fetcher, swrConfig);

  // 2. Fetch Activities
  const {
    data: activities,
    error: activitiesError,
    isLoading: activitiesLoading,
    mutate: mutateActivities,
  } = useSWR<DashboardActivity[]>(
    "/super-admin/dashboard/activities",
    fetcher,
    swrConfig,
  );

  // 3. Fetch Alerts
  const {
    data: alerts,
    error: alertsError,
    isLoading: alertsLoading,
    mutate: mutateAlerts,
  } = useSWR<DashboardAlert[]>(
    "/super-admin/dashboard/alerts",
    fetcher,
    swrConfig,
  );

  // Combined States
  const isLoading = statsLoading || activitiesLoading || alertsLoading;
  const error = statsError || activitiesError || alertsError;

  // Safe Data Defaults
  const stats = statsData?.stats || [];
  const quickStats = statsData?.quickAccess || {
    approvals: { total: 0, details: "Loading..." },
    disputes: { total: 0, details: "Loading..." },
    revenue: { growth: "0%", details: "Loading...", isPositive: true },
  };
  const trending = statsData?.trending;
  const activitiesList = activities || [];
  const alertsList = alerts || [];

  // ===========================================================================
  //  ACTIONS
  // ===========================================================================

  // Manual Refresh Handler
  const handleRefresh = () => {
    mutateStats();
    mutateActivities();
    mutateAlerts();
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await fetcher(`/super-admin/dashboard/alerts/${id}/resolve`, {
        method: "POST",
      });

      // SWR Re-fetch to update UI state
      mutateAlerts();
      mutateStats();
    } catch (err) {
      console.error("Failed to resolve alert", err);
      alert("Failed to resolve alert. Please try again.");
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // UX Delay

      const csvRows = [];
      csvRows.push(["--- SYSTEM OVERVIEW REPORT ---"]);
      csvRows.push([`Generated on: ${new Date().toLocaleString()}`]);
      csvRows.push([]);

      // Key Metrics
      csvRows.push(["--- KEY METRICS ---"]);
      csvRows.push(["Metric", "Value", "Change"]);
      stats.forEach((s) => csvRows.push([s.label, s.value, s.change]));
      csvRows.push([]);

      // Trending Data
      if (trending) {
        csvRows.push(["--- TRENDING METRICS ---"]);
        csvRows.push(["Weekly Order Growth", `${trending.ordersWeekly}%`]);
        csvRows.push(["Weekly Revenue Growth", `${trending.revenueWeekly}%`]);
        csvRows.push([
          "Is Accelerating",
          trending.isAccelerating ? "Yes" : "No",
        ]);
        csvRows.push(["Critical Alerts", String(trending.criticalAlerts)]);
        csvRows.push([]);
      }

      // Recent Activity
      csvRows.push(["--- RECENT ACTIVITIES ---"]);
      csvRows.push(["Type", "Event", "Entity", "Time"]);
      activitiesList.forEach((a) =>
        csvRows.push([a.type, a.event, a.entity, a.time]),
      );
      csvRows.push([]);

      // Active Alerts
      csvRows.push(["--- ACTIVE ALERTS ---"]);
      csvRows.push(["Category", "Severity", "Message", "Status", "Time"]);
      alertsList.forEach((a) =>
        csvRows.push([a.category, a.severity, a.message, a.status, a.time]),
      );

      const csvContent =
        "data:text/csv;charset=utf-8," +
        csvRows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `admin_report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Report generation failed", err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // ===========================================================================
  //  RENDER HELPERS
  // ===========================================================================

  const activityColumns = useMemo(() => createActivityColumns(), []);
  const alertColumns = useMemo(
    () => createAlertColumns({ onResolve: handleResolveAlert }),
    [],
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "ShoppingCart":
        return ShoppingCart;
      case "DollarSign":
        return DollarSign;
      case "Truck":
        return Truck;
      case "UserCheck":
        return UserCheck;
      default:
        return ShoppingCart;
    }
  };

  // ===========================================================================
  //  UI STATES
  // ===========================================================================

  if (isLoading) return <SuperAdminDashboardSkeleton />;

  // Full Page Error (Only if EVERYTHING fails)
  if (error && stats.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="bg-[#1E293B] p-6 rounded-xl border border-red-800 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-400 mb-4">
            {(error as Error).message || "Unable to connect to server"}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              System Overview
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time platform performance monitoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Partial Error Banner (If only some requests failed) */}
        {error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-200 text-sm font-medium">
                Some data may be incomplete
              </p>
              <p className="text-yellow-200/70 text-xs mt-1">
                {(error as Error).message}
              </p>
            </div>
          </div>
        )}

        {/* Trending Indicator */}
        {trending && (
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white">System Velocity</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Weekly Orders</p>
                <p
                  className={`font-bold ${trending.ordersWeekly >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {trending.ordersWeekly > 0 ? "+" : ""}
                  {trending.ordersWeekly}%
                </p>
              </div>
              <div>
                <p className="text-gray-400">Weekly Revenue</p>
                <p
                  className={`font-bold ${trending.revenueWeekly >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {trending.revenueWeekly > 0 ? "+" : ""}
                  {trending.revenueWeekly}%
                </p>
              </div>
              <div>
                <p className="text-gray-400">Momentum</p>
                <p
                  className={`font-bold ${trending.isAccelerating ? "text-green-400" : "text-orange-400"}`}
                >
                  {trending.isAccelerating ? "Accelerating ⬆" : "Stable →"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Critical Items</p>
                <p className="font-bold text-orange-400">
                  {trending.criticalAlerts}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.length > 0 ? (
            stats.map((stat, i) => {
              const Icon = getIcon(stat.iconName);
              return (
                <div
                  key={i}
                  className="bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800 shadow-sm relative overflow-hidden group hover:border-gray-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-gray-400 text-xs uppercase font-bold">
                        {stat.label}
                      </p>
                      <h3 className="text-2xl md:text-3xl font-black mt-1 text-white">
                        {stat.value}
                      </h3>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={`${stat.trend === "up" ? "text-green-500" : "text-red-500"} flex items-center gap-1`}
                    >
                      {stat.trend === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {stat.change}
                    </span>
                    <span className="text-gray-500">vs last period</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>No stats data available</p>
            </div>
          )}
        </div>

        {/* Real-time Activity Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="font-bold text-lg text-white">Real-time Activity</h2>
            <Link
              href="/super-admin/activity-logs"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All Logs
            </Link>
          </div>

          <div className="flex-1 min-h-0">
            {activitiesList.length > 0 ? (
              <DataTable
                data={activitiesList}
                columns={activityColumns}
                rowSelection={activityRowSelection}
                onRowSelectionChange={setActivityRowSelection}
                pageSize={5}
                renderMobileCard={(activity) => {
                  const card = renderActivityMobileCard(activity);
                  return React.cloneElement(card, {
                    className: `${card.props.className} ${
                      selectedCards[`activity-${activity.id}`]
                        ? "border-2 border-blue-500"
                        : ""
                    }`,
                    onClick: () => handleCardSelect(`activity-${activity.id}`),
                  });
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health & Alerts */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">
            System Health & Alerts
          </h2>

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
              <UserCheck className="w-4 h-4" /> Active Users:{" "}
              {stats.find((s) => s.label === "Active Users")?.value || "N/A"}
            </div>
            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-yellow-500/70 text-xs italic">
              Status indicators are static placeholders — connect a health endpoint for live data.
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-red-500/5 flex justify-between items-center">
              <h3 className="font-bold text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Critical Alerts
              </h3>
              <span className="text-xs text-gray-400">
                {alertsList.filter((a) => a.severity === "HIGH").length} High
                Priority
              </span>
            </div>

            <div className="flex-1 min-h-0">
              {alertsList.length > 0 ? (
                <DataTable
                  data={alertsList}
                  columns={alertColumns}
                  rowSelection={alertRowSelection}
                  onRowSelectionChange={setAlertRowSelection}
                  pageSize={5}
                  renderMobileCard={(alert) => {
                    const card = renderAlertMobileCard(alert);
                    return React.cloneElement(card, {
                      className: `${card.props.className} ${
                        selectedCards[`alert-${alert.id}`]
                          ? "border-2 border-red-500"
                          : ""
                      }`,
                      onClick: () => handleCardSelect(`alert-${alert.id}`),
                    });
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p>No active alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-4">
          {/* Pending Approvals */}
          <div
            className={`bg-[#1E293B] p-4 md:p-6 rounded-xl border ${
              selectedCards["pending-approvals"]
                ? "border-2 border-yellow-500"
                : "border-gray-800 hover:border-yellow-500/50"
            } transition-colors group cursor-pointer`}
            onClick={() => handleCardSelect("pending-approvals")}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-gray-200">Pending Approvals</h4>
                <div className="text-2xl md:text-3xl font-black text-yellow-500 my-2">
                  {quickStats.approvals.total}
                </div>
                <p className="text-xs text-gray-400">
                  {quickStats.approvals.details}
                </p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <Link href="/super-admin/verification">
              <button className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-sm transition-colors">
                Review Now
              </button>
            </Link>
          </div>

          {/* Open Disputes */}
          <div
            className={`bg-[#1E293B] p-4 md:p-6 rounded-xl border ${
              selectedCards["open-disputes"]
                ? "border-2 border-orange-500"
                : "border-gray-800 hover:border-orange-500/50"
            } transition-colors group cursor-pointer`}
            onClick={() => handleCardSelect("open-disputes")}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-gray-200">Open Disputes</h4>
                <div className="text-2xl md:text-3xl font-black text-orange-500 my-2">
                  {quickStats.disputes.total}
                </div>
                <p className="text-xs text-gray-400">
                  {quickStats.disputes.details}
                </p>
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

          {/* Revenue Report */}
          <div
            className={`bg-[#1E293B] p-4 md:p-6 rounded-xl border ${
              selectedCards["revenue-report"]
                ? "border-2 border-blue-500"
                : "border-gray-800 hover:border-blue-500/50"
            } transition-colors group cursor-pointer`}
            onClick={() => handleCardSelect("revenue-report")}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-gray-200">Revenue Report</h4>
                <p className="text-xs text-gray-400 mt-1 mb-3">
                  {quickStats.revenue.details}
                </p>
                <div
                  className={`text-lg font-bold ${quickStats.revenue.isPositive ? "text-green-400" : "text-red-400"}`}
                >
                  {quickStats.revenue.growth}
                </div>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <Link href="/super-admin/reports">
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
