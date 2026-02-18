"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Download,
  Search,
  Eye,
  Filter,
  Package,
  Truck,
  FileText,
  Trash2,
  Map as MapIcon,
  List,
  UserPlus,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import { DataTable } from "@/app/super-admin/component/datatable";
import { DeliveryCard } from "./components/deliverycard";
import { DeliveriesPageSkeleton } from "./components/skeleton";
import { fetcher } from "../hooks/useSuperAdminFetch";

// --- Types ---
interface Delivery {
  id: string;
  type: string;
  sender: string;
  recipient: string;
  driver: string;
  status: string;
  pickup: string;
  dropoff: string;
  eta?: string; // ✅ FIX: Made optional to handle missing data
}

interface ApiResponse {
  data: Delivery[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// --- Mock Map Component (Unchanged) ---
const DeliveryMap = ({ deliveries }: { deliveries: Delivery[] }) => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-xl h-[600px] relative overflow-hidden group">
    <div
      className="absolute inset-0 bg-[#0F172A]"
      style={{
        backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Mock Pins */}
      {deliveries.slice(0, 5).map((d, i) => (
        <div
          key={d.id}
          className="absolute flex flex-col items-center gap-1 cursor-pointer hover:z-10 group/pin"
          style={{ top: `${20 + i * 15}%`, left: `${10 + i * 18}%` }}
        >
          <div
            className={`p-2 rounded-full border-2 border-white shadow-lg ${
              d.status === "In Transit" ? "bg-blue-500" : "bg-yellow-500"
            }`}
          >
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap">
            {d.id} • {d.driver}
          </div>
        </div>
      ))}
    </div>
    <div className="absolute bottom-4 left-4 bg-gray-900/90 p-4 rounded-lg border border-gray-800 backdrop-blur text-xs">
      <p className="font-bold text-white mb-2">Live Fleet Status</p>
      <div className="flex gap-4">
        <span className="flex items-center gap-1 text-blue-400">
          <div className="w-2 h-2 rounded-full bg-blue-500" /> Moving
        </span>
        <span className="flex items-center gap-1 text-yellow-400">
          <div className="w-2 h-2 rounded-full bg-yellow-500" /> Idle
        </span>
        <span className="flex items-center gap-1 text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-500" /> Delivered
        </span>
      </div>
    </div>
  </div>
);

export default function DeliveriesPage() {
  // UI State
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [rowSelection, setRowSelection] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter State
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  // Construct query string dynamically
  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
    });

    if (searchTerm) params.append("search", searchTerm);
    if (statusFilter !== "All") params.append("status", statusFilter);
    if (dateRange.from) params.append("from", dateRange.from);
    if (dateRange.to) params.append("to", dateRange.to);

    return params.toString();
  }, [pagination, searchTerm, statusFilter, dateRange]);

  const {
    data: apiResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiResponse>(
    `/super-admin/deliveries?${queryString}`,
    fetcher,
    { keepPreviousData: true }, // Keeps list visible while filtering
  );

  const deliveries = apiResponse?.data || [];
  const total = apiResponse?.meta?.total || 0;

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleAssignDriver = (id: string) => {
    Swal.fire({
      title: "Assign Driver",
      input: "select",
      inputOptions: { d1: "James Wilson (Nearby)", d2: "Sarah Jones (Idle)" },
      inputPlaceholder: "Select a driver",
      showCancelButton: true,
      confirmButtonColor: "#eab308",
      background: "#1E293B",
      color: "#fff",
    }).then((res) => {
      if (res.isConfirmed) {
        // Add API call here
        toast.success("Driver assigned successfully");
        mutate(); // Refresh list after assignment
      }
    });
  };

  const handleBulkManifest = () => {
    const count = Object.keys(rowSelection).length;
    toast.info(`Generating manifest for ${count} orders...`);
  };

  // ✅ FIX: Updated signature to allow undefined eta and added safety check
  const isLate = (eta: string | undefined, status: string) => {
    if (status === "Delivered" || status === "Cancelled") return false;
    // Safety check: if eta is missing, we can't check 'includes'
    if (!eta) return false;
    return eta.includes("Late") || Math.random() > 0.8;
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "DELIVERED")
      return "bg-green-500/10 text-green-500 border-green-500/20";
    if (s === "IN TRANSIT" || s === "PICKED_UP")
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === "PENDING PICKUP" || s === "ASSIGNED")
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  // ===========================================================================
  //  COLUMNS CONFIG
  // ===========================================================================

  const columns = useMemo<ColumnDef<Delivery>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Tracking ID",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/super-admin/deliveries/${row.original.id}`}
              className="text-yellow-500 font-mono font-bold text-xs hover:underline block"
            >
              {row.original.id.substring(0, 10)}...
            </Link>
            {isLate(row.original.eta, row.original.status) && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold mt-0.5 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Delayed
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${getStatusColor(row.original.status)}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-white">
            {row.original.type?.includes("Document") ? (
              <FileText className="w-4 h-4 text-blue-400" />
            ) : (
              <Package className="w-4 h-4 text-orange-400" />
            )}
            <span className="text-sm">{row.original.type}</span>
          </div>
        ),
      },
      {
        accessorKey: "route",
        header: "Route",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-xs max-w-[180px]">
            <span
              className="text-gray-400 truncate"
              title={row.original.pickup}
            >
              From: <span className="text-white">{row.original.pickup}</span>
            </span>
            <span
              className="text-gray-400 truncate"
              title={row.original.dropoff}
            >
              To: <span className="text-white">{row.original.dropoff}</span>
            </span>
          </div>
        ),
      },
      {
        accessorKey: "driver",
        header: "Driver",
        cell: ({ row }) => (
          <span
            className={`text-sm ${row.original.driver === "-" ? "text-gray-500 italic" : "text-gray-300"}`}
          >
            {row.original.driver}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.status === "Pending Pickup" ||
            row.original.driver === "-" ? (
              <button
                onClick={() => handleAssignDriver(row.original.id)}
                className="p-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded hover:bg-yellow-500 hover:text-black transition-colors"
                title="Assign Driver"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href={`/super-admin/deliveries/${row.original.id}`}
                className="p-1.5 hover:bg-blue-500/10 rounded text-gray-400 hover:text-blue-500 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </Link>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  // Loading State
  if (isLoading && deliveries.length === 0) return <DeliveriesPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Logistics & Deliveries
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage fleet movements and assignments
            </p>
          </div>

          <div className="flex gap-2">
            {/* Manual Refresh Button */}
            <button
              onClick={() => mutate()}
              className="p-2 bg-[#1E293B] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>

            {/* Map/List Toggle */}
            <div className="flex bg-[#1E293B] p-1 rounded-lg border border-gray-700">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-md transition-colors ${viewMode === "map" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="md:hidden p-2 bg-[#1E293B] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg text-sm hover:bg-yellow-400 transition-colors">
              <Package className="w-4 h-4" /> New Shipment
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          className={`bg-[#1E293B] p-4 rounded-xl border border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-4 ${filterOpen ? "block" : "hidden md:grid"}`}
        >
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search Tracking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-2 py-2 text-sm text-gray-300 outline-none focus:border-yellow-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg p-2 outline-none"
          >
            <option value="All">All Status</option>
            <option value="In Transit">In Transit</option>
            <option value="Pending Pickup">Pending Pickup</option>
            <option value="Delivered">Delivered</option>
          </select>

          <div className="flex gap-2 md:col-span-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, from: e.target.value }))
              }
              className="w-full bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg px-2"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, to: e.target.value }))
              }
              className="w-full bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg px-2"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {Object.keys(rowSelection).length > 0 && viewMode === "list" && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-2">
            <span className="text-blue-400 text-sm font-bold ml-2">
              {Object.keys(rowSelection).length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkManifest}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600"
              >
                <FileSpreadsheet className="w-3 h-3" /> Generate Manifest
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded hover:bg-red-500 hover:text-white">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-center">
            Failed to load deliveries.
            <button
              onClick={() => mutate()}
              className="ml-2 underline hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {viewMode === "list" ? (
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
            <DataTable
              columns={columns}
              data={deliveries}
              pagination={pagination}
              onPaginationChange={setPagination}
              pageCount={Math.ceil(total / pagination.pageSize)}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              renderMobileCard={(d) => <DeliveryCard delivery={d} />}
            />
          </div>
        ) : (
          <DeliveryMap deliveries={deliveries} />
        )}
      </div>
    </div>
  );
}
