"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { toast } from "react-toastify";
import { AssignRiderModal } from "./components/AssignRiderModal";

import { DataTable } from "@/app/super-admin/component/datatable";
import { DeliveryCard } from "./components/deliverycard";
import { DeliveriesPageSkeleton } from "./components/skeleton";
import { fetcher } from "../hooks/useSuperAdminFetch";

// --- Types ---
interface Delivery {
  id: string;
  orderGroupId?: string | null;
  type: string;
  sender: string;
  recipient: string;
  driver: string;
  riderId?: string | null;
  status: string;
  pickup: string;
  dropoff: string;
  eta?: string;
  isFragile?: boolean;
  isPerishable?: boolean;
  containsLiquid?: boolean;
  weightKg?: number | null;
  packageDetails?: string | null;
  orderItems?: string[];
  isPaid?: boolean;
  paymentStatus?: string;
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
            className={`p-2 rounded-full border-2 border-white shadow-lg ${d.status === "In Transit" ? "bg-blue-500" : "bg-yellow-500"
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
  const [assignDeliveryId, setAssignDeliveryId] = useState<string | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);

  // Filter State
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
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

    if (debouncedSearch) params.append("search", debouncedSearch);
    if (statusFilter !== "All") params.append("status", statusFilter);
    if (dateRange.from) params.append("from", dateRange.from);
    if (dateRange.to) params.append("to", dateRange.to);

    return params.toString();
  }, [pagination, debouncedSearch, statusFilter, dateRange]);

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

  // Group deliveries by orderGroupId
  const groupMap = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    deliveries.forEach((d) => {
      if (d.orderGroupId) {
        const arr = map.get(d.orderGroupId) ?? [];
        arr.push(d);
        map.set(d.orderGroupId, arr);
      }
    });
    return map;
  }, [deliveries]);

  const standaloneDeliveries = useMemo(
    () => deliveries.filter((d) => !d.orderGroupId),
    [deliveries],
  );

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleAssignRider = (id: string) => setAssignDeliveryId(id);

  const handleBulkManifest = () => {
    const count = Object.keys(rowSelection).length;
    toast.info(`Generating manifest for ${count} orders...`);
  };

  // ✅ FIX: Updated signature to allow undefined eta and added safety check
  const isLate = (eta: string | undefined, status: string) => {
    if (status === "Delivered" || status === "Cancelled") return false;
    if (!eta) return false;
    // Check the backend-supplied eta string for an explicit "Late" marker
    if (eta.includes("Late")) return true;
    // Parse ISO dates: if the backend provides an ISO timestamp, compare to now
    const etaDate = new Date(eta);
    if (!isNaN(etaDate.getTime())) return etaDate < new Date();
    return false;
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
          <div className="flex flex-col gap-1 items-start">
            <span
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${getStatusColor(row.original.status)}`}
            >
              {row.original.status}
            </span>
            {row.original.isPaid === false && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border bg-red-500/10 text-red-500 border-red-500/20 whitespace-nowrap animate-pulse">
                UNPAID
              </span>
            )}
          </div>
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
        cell: ({ row }) => {
          const needsRider =
            row.original.status === "Pending Pickup" || row.original.driver === "-";
          const canAssign = needsRider && row.original.isPaid !== false;

          return (
            <div className="flex items-center gap-2">
              {needsRider ? (
                <button
                  onClick={() => (canAssign ? handleAssignRider(row.original.id) : toast.error("Cannot assign rider to an unpaid delivery."))}
                  className={`p-1.5 border rounded transition-colors ${canAssign
                      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black cursor-pointer"
                      : "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-50"
                    }`}
                  title={canAssign ? "Assign Rider" : "Cannot assign rider to unpaid delivery"}
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
          );
        },
      },
    ],
    [],
  );

  // Loading State
  if (isLoading && deliveries.length === 0) return <DeliveriesPageSkeleton />;

  return (
    <>
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

              <Link href="/super-admin/deliveries/new" className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg text-sm hover:bg-yellow-400 transition-colors">
                <Package className="w-4 h-4" /> New Shipment
              </Link>
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

          {/* Group Orders Section */}
          {groupMap.size > 0 && viewMode === "list" && (
            <div className="space-y-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-yellow-500" />
                Group Orders ({groupMap.size})
              </h2>
              {Array.from(groupMap.entries()).map(([groupId, items]) => {
                const lead = items[0];
                const allAssigned = items.every((d) => d.riderId);
                return (
                  <div
                    key={groupId}
                    className="bg-[#1E293B] border border-yellow-500/20 rounded-xl p-4 space-y-3"
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-500 font-bold text-xs font-mono">
                          GROUP · {groupId.substring(0, 10)}...
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {items.length} deliveries · Drop-off:{" "}
                          <span className="text-white">{lead.dropoff}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${allAssigned
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            }`}
                        >
                          {allAssigned ? "Assigned" : "Unassigned"}
                        </span>
                        <button
                          onClick={() => setAssignGroupId(groupId)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          Assign Rider
                        </button>
                      </div>
                    </div>

                    {/* Sub-deliveries */}
                    <div className="space-y-1.5">
                      {items.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between bg-[#0F172A] rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Package className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-white text-xs font-mono truncate">
                                {d.id.substring(0, 12)}...
                              </p>
                              <p className="text-gray-500 text-[10px] truncate">
                                From: {d.pickup}
                              </p>
                              {d.orderItems && d.orderItems.length > 0 && (
                                <p className="text-gray-600 text-[10px] truncate">
                                  {d.orderItems.length === 1
                                    ? d.orderItems[0]
                                    : `${d.orderItems[0]} + ${d.orderItems.length - 1} more`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {d.isFragile && (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                ⚠ Fragile
                              </span>
                            )}
                            {d.isPerishable && (
                              <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                                🌡 Perishable
                              </span>
                            )}
                            {d.containsLiquid && (
                              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                💧 Liquid
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(d.status)}`}
                            >
                              {d.status}
                            </span>
                            <Link
                              href={`/super-admin/deliveries/${d.id}`}
                              className="p-1 hover:bg-blue-500/10 rounded text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Content Area */}
          {viewMode === "list" ? (
            <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
              <DataTable
                columns={columns}
                data={standaloneDeliveries}
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

      {/* Assign Rider Modal — single delivery */}
      {assignDeliveryId && (
        <AssignRiderModal
          deliveryId={assignDeliveryId}
          onClose={() => setAssignDeliveryId(null)}
          onSuccess={() => mutate()}
        />
      )}

      {/* Assign Rider Modal — order group */}
      {assignGroupId && (
        <AssignRiderModal
          groupId={assignGroupId}
          onClose={() => setAssignGroupId(null)}
          onSuccess={() => mutate()}
        />
      )}
    </>
  );
}
