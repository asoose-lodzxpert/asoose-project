"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Clock,
  User,
  Car,
  Download,
  Settings,
  Eye,
  AlertTriangle,
  Loader2,
  Calendar,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { DataTable } from "../component/datatable";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import useSWR from "swr";
import { getSession } from "next-auth/react"; // ✅ Import NextAuth
import RidesPageSkeleton from "./skeleton";
import { fetcher } from "../hooks/useSuperAdminFetch";
import { formatDateTime } from "@/utils/formatDate";

// --- Types ---
interface Ride {
  id: string;
  driver: { name: string; car: string; rating: number } | null;
  passenger: string;
  from: string;
  to: string;
  fare: string;
  status: string;
  isScheduled?: boolean;
  scheduledAt?: string;
  time: string; // ISO String
}

interface RidesApiResponse {
  data: Ride[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// --- Helper: Debounce (Unchanged) ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function RidesPage() {
  // --- UI State ---
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filterOpen, setFilterOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, statusFilter, dateRange]);

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
    });

    if (debouncedSearch) params.append("search", debouncedSearch);
    if (statusFilter !== "All")
      params.append("status", statusFilter.toUpperCase());
    if (dateRange.from) params.append("from", dateRange.from);
    if (dateRange.to) params.append("to", dateRange.to);

    return params.toString();
  }, [pagination, debouncedSearch, statusFilter, dateRange]);

  const {
    data: apiResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<RidesApiResponse>(`/super-admin/rides?${queryString}`, fetcher, {
    keepPreviousData: true,
  });

  const rides = apiResponse?.data || [];
  const totalRides = apiResponse?.meta?.total || 0;

  // --- Actions ---
  const handleCancelRide = useCallback(
    async (id: string) => {
      const result = await Swal.fire({
        title: "Cancel Ride?",
        text: "This action cannot be undone and will stop the trip immediately.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Yes, Cancel",
        background: "#1E293B",
        color: "#fff",
      });

      if (result.isConfirmed) {
        try {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

          // ✅ Get Session via NextAuth
          const session = await getSession();
          const token = (session as any)?.accessToken;

          const res = await fetch(`${API_URL}/super-admin/rides/${id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }, // ✅ Use Token
          });

          if (!res.ok) throw new Error("Failed to cancel");

          Swal.fire({
            title: "Cancelled",
            icon: "success",
            background: "#1E293B",
            color: "#fff",
            timer: 1500,
            showConfirmButton: false,
          });

          // ✅ Refresh List
          mutate();
        } catch (error) {
          Swal.fire({
            title: "Error",
            text: "Could not cancel ride",
            icon: "error",
            background: "#1E293B",
            color: "#fff",
          });
        }
      }
    },
    [mutate],
  );

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("All");
    setDateRange({ from: "", to: "" });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const s = status?.toUpperCase().replace("_", " ");
    if (s === "COMPLETED")
      return "bg-green-500/20 text-green-500 border-green-500/20";
    if (s === "IN PROGRESS" || s === "INPROGRESS")
      return "bg-blue-500/20 text-blue-400 border-blue-500/20";
    if (s === "SCHEDULED")
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    if (s === "SEARCHING" || s === "REQUESTED")
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/20";
    if (s === "CANCELLED" || s === "CANCELLED BY USER" || s === "CANCELLED BY DRIVER")
      return "bg-red-500/20 text-red-500 border-red-500/20";
    return "bg-gray-500/20 text-gray-400 border-gray-500/20";
  }, []);

  const isRideCancellable = useCallback((status: string) => {
    return ["IN_PROGRESS", "REQUESTED", "SEARCHING", "IN PROGRESS"].includes(
      status?.toUpperCase().replace("_", " "),
    );
  }, []);

  // --- Columns ---
  const columns = useMemo<ColumnDef<Ride>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Ride ID",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/super-admin/rides/${row.original.id}`}
              className="font-mono text-yellow-500 hover:text-yellow-400 font-bold transition-colors text-xs hover:underline block"
            >
              {row.original.id.substring(0, 8)}...
            </Link>
            <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(row.original.time)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "driver",
        header: "Driver",
        cell: ({ row }) =>
          row.original.driver ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                {row.original.driver.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-medium text-sm">
                  {row.original.driver.name}
                </p>
                <div className="flex items-center gap-1">
                  <Car className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500 truncate max-w-[100px]">
                    {row.original.driver.car}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-500 font-medium bg-gray-500/10 px-2 py-1 rounded">
              Not Assigned
            </span>
          ),
      },
      {
        accessorKey: "passenger",
        header: "Passenger",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-gray-300">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{row.original.passenger}</span>
          </div>
        ),
      },
      {
        accessorKey: "route",
        header: "Route",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span
                className="truncate max-w-[120px]"
                title={row.original.from}
              >
                {row.original.from}
              </span>
            </div>
            <div className="w-0.5 h-3 bg-gray-700 ml-0.5"></div>
            <div className="flex items-center gap-2 text-xs text-white font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <span className="truncate max-w-[120px]" title={row.original.to}>
                {row.original.to}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border w-fit ${getStatusColor(row.original.status)}`}
            >
              {row.original.status.replace(/_/g, " ")}
            </span>
            {row.original.isScheduled && (
              <span className="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase w-fit tracking-tighter">
                Scheduled
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "fare",
        header: "Fare",
        cell: ({ row }) => (
          <span className="font-bold text-white text-sm">
            {row.original.fare}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Link href={`/super-admin/rides/${row.original.id}`}>
              <button
                className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </Link>
            {isRideCancellable(row.original.status) && (
              <button
                onClick={() => handleCancelRide(row.original.id)}
                className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                title="Cancel Ride"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [getStatusColor, handleCancelRide, isRideCancellable],
  );

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Ride Dispatch
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time monitoring of fleet and trips
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => mutate()}
              className="p-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="md:hidden p-2 border border-gray-800 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div
          className={`bg-[#1E293B] p-4 rounded-xl border border-gray-800 space-y-4 ${filterOpen ? "block" : "hidden md:block"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Ride ID, Driver, or Passenger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:border-yellow-500 outline-none transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0F172A] text-gray-300 text-sm px-3 py-2 rounded-lg border border-gray-800 focus:border-yellow-500 outline-none transition-colors cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="REQUESTED">Requested</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2 md:col-span-2 lg:col-span-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                  className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-2 py-2 text-sm text-gray-300 focus:border-yellow-500 outline-none [color-scheme:dark] transition-colors"
                />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-2 py-2 text-sm text-gray-300 focus:border-yellow-500 outline-none [color-scheme:dark] transition-colors"
                />
              </div>
              {(searchTerm ||
                statusFilter !== "All" ||
                dateRange.from ||
                dateRange.to) && (
                <button
                  onClick={handleClearFilters}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear Filters"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        {isLoading && rides.length === 0 ? (
          <RidesPageSkeleton />
        ) : (
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
            {rides.length > 0 ? (
              <DataTable
                columns={columns}
                data={rides}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                renderMobileCard={(ride) => (
                  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start mb-3">
                      <Link
                        href={`/super-admin/rides/${ride.id}`}
                        className="text-yellow-500 font-mono font-bold text-sm hover:text-yellow-400 transition-colors"
                      >
                        {ride.id.substring(0, 10)}...
                      </Link>
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(ride.status)}`}
                      >
                        {ride.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Passenger:</span>
                        <span className="text-white">{ride.passenger}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Driver:</span>
                        <span className="text-white">
                          {ride.driver?.name || "Not Assigned"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fare:</span>
                        <span className="text-white font-bold">
                          {ride.fare}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-700">
                      <Link
                        href={`/super-admin/rides/${ride.id}`}
                        className="flex-1"
                      >
                        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-sm font-medium">
                          <Eye className="w-4 h-4" /> View Details
                        </button>
                      </Link>
                      {isRideCancellable(ride.status) && (
                        <button
                          onClick={() => handleCancelRide(ride.id)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                        >
                          <AlertTriangle className="w-4 h-4" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
                pageCount={Math.ceil(totalRides / pagination.pageSize)}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-base mb-2">
                  No rides found matching your filters.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-yellow-500 hover:underline font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
