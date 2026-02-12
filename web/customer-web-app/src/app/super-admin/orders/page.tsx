"use client";

import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  Search,
  Calendar,
  ChevronRight,
  Copy,
  RotateCcw,
  Download,
  Layers, // Added icon for Group
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-toastify";

import { DataTable } from "../component/datatable";
import { fetcher } from "../hooks/useSuperAdminFetch";
import { Currency } from "@/app/main/components/Currency";
import { OrderListSkeleton } from "./components/skeleton";

// --- Types ---
interface OrderListItem {
  id: string;
  groupId?: string; // ✅ FIX: Added groupId to support multi-vendor grouping
  status: string;
  customer: string;
  vendor: string;
  rider: string;
  amount: number;
  paymentStatus: string;
  type: string;
  placedAt: string;
}

interface OrdersResponse {
  data: OrderListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function OrdersPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // --- 1. Debounce Logic Hook ---
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  // --- 2. Data Fetching Hook ---
  const queryParams = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "All" && { status: statusFilter }),
    ...(typeFilter !== "All" && { type: typeFilter }),
  });

  const { data, isLoading, mutate } = useSWR<OrdersResponse>(
    `/super-admin/orders?${queryParams.toString()}`,
    fetcher,
    { keepPreviousData: true },
  );

  // --- 3. Columns Definition Hook ---
  const columns = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {/* Main Order ID */}
            <div className="flex items-center gap-2 group">
              <span className="font-mono text-xs text-gray-400">
                #{row.original.id.substring(0, 8).toUpperCase()}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(row.original.id);
                  toast.success("ID Copied");
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
              >
                <Copy size={12} className="text-gray-500" />
              </button>
            </div>

            {/* ✅ FIX: Group Badge for Multi-Vendor Orders */}
            {row.original.groupId && (
              <div
                className="flex items-center gap-1 w-fit px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-colors"
                title={`Part of Group Order #${row.original.groupId}`}
                onClick={() => {
                  navigator.clipboard.writeText(row.original.groupId!);
                  toast.success("Group ID Copied");
                }}
              >
                <Layers size={10} className="text-purple-400" />
                <span className="font-mono text-[9px] font-bold text-purple-400">
                  GRP: {row.original.groupId.substring(0, 6)}
                </span>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const colors: Record<string, string> = {
            PENDING: "text-amber-500 bg-amber-500/10 border-amber-500/20",
            CONFIRMED: "text-blue-500 bg-blue-500/10 border-blue-500/20",
            PREPARING: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
            DELIVERED:
              "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            CANCELLED: "text-rose-500 bg-rose-500/10 border-rose-500/20",
          };
          return (
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold border uppercase ${colors[status] || "text-gray-500 bg-gray-500/10 border-gray-500/20"}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <span className="font-medium text-white text-sm">
            {row.original.customer}
          </span>
        ),
      },
      {
        accessorKey: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
          <span className="text-gray-400 text-sm">{row.original.vendor}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-bold text-white text-sm">
            <Currency amount={row.original.amount} />
          </span>
        ),
      },
      {
        accessorKey: "placedAt",
        header: "Date",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-white text-xs">
              {format(new Date(row.original.placedAt), "MMM dd, yyyy")}
            </span>
            <span className="text-gray-500 text-[10px] font-mono">
              {format(new Date(row.original.placedAt), "HH:mm")}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/super-admin/orders/${row.original.id}`}
            className="p-2 hover:bg-yellow-500/10 rounded-lg text-yellow-500 transition-colors inline-block"
            title="View Details"
          >
            <Eye size={16} />
          </Link>
        ),
      },
    ],
    [],
  );

  // --- 4. Handle Early Loading State ---
  if (isLoading && !data) {
    return <OrderListSkeleton />;
  }

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Order Management</h1>
          <p className="text-gray-500 text-sm">Monitor platform fulfillment</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-gray-300 rounded-lg text-sm hover:text-white transition-all">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search ID, Customer, Store, Group..."
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              className="bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Food">Food</option>
              <option value="Grocery">Grocery</option>
              <option value="Pharmacy">Pharmacy</option>
            </select>

            <button
              onClick={resetFilters}
              className="p-2 text-gray-500 hover:text-white transition-colors"
              title="Reset Filters"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#1E293B] rounded-xl border border-gray-800 overflow-hidden shadow-xl min-h-[500px]">
        <DataTable
          data={data?.data || []}
          columns={columns}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={data?.meta?.pages || 0}
          renderMobileCard={(order) => (
            <Link
              href={`/super-admin/orders/${order.id}`}
              className="block bg-[#1E293B] border border-gray-800 rounded-xl p-4 active:scale-[0.98] transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-gray-500 font-bold uppercase">
                    #{order.id.substring(0, 8)}
                  </span>
                  {/* Mobile Group Badge */}
                  {order.groupId && (
                    <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 w-fit">
                      GRP: {order.groupId.substring(0, 6)}
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${order.status === "PENDING" ? "text-amber-500 border-amber-500/20" : "text-emerald-500 border-emerald-500/20"}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white font-bold text-sm">
                    {order.customer}
                  </p>
                  <p className="text-gray-500 text-xs">{order.vendor}</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-500 font-bold mb-1">
                    <Currency amount={order.amount} />
                  </p>
                  <ChevronRight size={16} className="text-gray-700 ml-auto" />
                </div>
              </div>
            </Link>
          )}
        />
      </div>
    </div>
  );
}