'use client';

import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/app/super-admin/component/datatable";
import { Eye, CheckSquare, Square, Search, Filter, X } from "lucide-react";
import OrderCard from "@/app/super-admin/component/ordercard";
import Link from "next/link";
import { Currency } from "@/app/main/components/Currency"; // ✅ Using your reusable Currency component

// --- Types ---
interface Order {
  id: string;
  date: string;
  customer: string;
  status: string;
  total: number;
  itemsCount: number;
  storeName?: string; // ✅ Added storeName property
}

// --- Helpers ---
const mapToCardOrder = (order: Order): any => ({
  id: order.id,
  status: order.status,
  customer: order.customer,
  vendor: order.storeName || "N/A", // ✅ Use actual store name
  rider: "N/A",
  amount: order.total,
  type: `${order.itemsCount} Items`,
  placedAt: new Date(order.date).toLocaleDateString(),
  updated: new Date(order.date).toLocaleDateString(),
});

const columnHelper = createColumnHelper<Order>();

export default function OrderHistoryTab({ orders }: { orders: Order[] }) {
  const [rowSelection, setRowSelection] = useState({});
  
  // --- New State for Filtering ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Logic (ID, Customer, or Vendor)
      const matchesSearch = 
        search === "" ||
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase()) ||
        (order.storeName && order.storeName.toLowerCase().includes(search.toLowerCase()));

      // 2. Status Logic
      const matchesStatus = 
        statusFilter === "ALL" || 
        order.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // --- Column Definitions ---
  const columns = useMemo(() => [
    {
      id: "select",
      header: ({ table }: any) => (
        <button 
          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
          onClick={table.getToggleAllRowsSelectedHandler()}
        >
          {table.getIsAllRowsSelected() ? (
            <CheckSquare className="w-4 h-4 text-yellow-500" />
          ) : (
            <Square className="w-4 h-4 text-gray-500" />
          )}
        </button>
      ),
      cell: ({ row }: any) => (
        <button 
          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
          onClick={row.getToggleSelectedHandler()}
        >
          {row.getIsSelected() ? (
            <CheckSquare className="w-4 h-4 text-yellow-500" />
          ) : (
            <Square className="w-4 h-4 text-gray-500" />
          )}
        </button>
      ),
    },
    columnHelper.accessor("id", {
      header: "Order ID",
      cell: info => (
        <Link 
          href={`/super-admin/orders/${info.getValue()}`}
          className="text-yellow-500 hover:text-yellow-400 font-bold transition-colors font-mono text-xs"
        >
          {info.getValue().substring(0, 8)}...
        </Link>
      ),
    }),
    columnHelper.accessor("date", {
      header: "Date",
      cell: info => <span className="text-gray-300 text-sm">{new Date(info.getValue()).toLocaleDateString()}</span>,
    }),
    columnHelper.accessor("customer", {
      header: "Customer",
      cell: info => <span className="font-bold text-white text-sm">{info.getValue()}</span>,
    }),
    // ✅ NEW: Store/Vendor Column
    columnHelper.accessor("storeName", {
        header: "Store",
        cell: info => <span className="text-gray-300 text-sm">{info.getValue() || '-'}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => {
        const status = info.getValue();
        const getStatusColor = (s: string) => {
          switch (s.toUpperCase()) {
            case 'DELIVERED': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
            case 'CANCELLED': return 'bg-red-500/20 text-red-400 border-red-500/20';
            case 'PREPARING': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-700 text-gray-300';
          }
        };
        return (
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor("itemsCount", {
      header: "Items",
      cell: info => <span className="text-gray-400 text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor("total", {
      header: "Total",
      // ✅ Using Reusable Currency Component
      cell: info => <Currency amount={info.getValue()} className="text-white" />,
    }),
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/super-admin/orders/${row.original.id}`}
            className="p-2 bg-gray-700/50 rounded-lg hover:bg-white/10 hover:text-white text-gray-400 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ], []);

  // --- Render ---
  return (
    <div className="h-full flex flex-col">
      
      {/* 1. Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total Shown</p>
          <p className="text-2xl font-bold text-white">{filteredOrders.length}</p>
        </div>
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Delivered</p>
          <p className="text-2xl font-bold text-green-500">
            {filteredOrders.filter(o => o.status === 'DELIVERED').length}
          </p>
        </div>
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-500">
            {filteredOrders.filter(o => o.status === 'PENDING').length}
          </p>
        </div>
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Cancelled</p>
          <p className="text-2xl font-bold text-red-500">
            {filteredOrders.filter(o => o.status === 'CANCELLED').length}
          </p>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            placeholder="Search by ID, Customer, or Store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative min-w-[150px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PREPARING">Preparing</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* 3. Table */}
      <div className="flex-1 overflow-hidden bg-[#0F172A] border border-gray-800 rounded-lg">
        <DataTable
          data={filteredOrders}
          columns={columns}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          renderMobileCard={(order) => (
            <OrderCard 
              order={mapToCardOrder(order)}
              showActions={true}
            />
          )}
        />
      </div>
    </div>
  );
}