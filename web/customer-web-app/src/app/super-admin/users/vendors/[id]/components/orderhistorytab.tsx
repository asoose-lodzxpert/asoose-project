'use client';

import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/app/super-admin/component/datatable";
import { Eye, CheckSquare, Square } from "lucide-react";
import OrderCard from "@/app/super-admin/component/ordercard";
import Link from "next/link";
interface Order {
  id: string;
  date: string;
  status: string;
  total: string;
  customer?: string;
  vendor?: string;
  rider?: string;
  amount?: number;
  type?: string;
  placedAt?: string;
  updated?: string;
}

// Helper to convert the tab's order format to the OrderCard's expected format
const mapToCardOrder = (order: Order): any => ({
  id: order.id,
  status: order.status,
  customer: order.customer,
  vendor: "Vendor Name", // You might want to pass this from parent or fetch it
  rider: "Rider Name", // You might want to pass this from parent or fetch it
  amount: parseFloat(order.total.replace('$', '')), // Convert "$45.00" to 45.00
  type: "General Goods", // Default or pass from parent
  placedAt: order.date,
  updated: order.date,
});

const columnHelper = createColumnHelper<Order>();

export default function OrderHistoryTab({ orders }: { orders: Order[] }) {
  const [rowSelection, setRowSelection] = useState({});

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
      className="text-yellow-500 hover:text-yellow-400 font-bold transition-colors"
    >
      {info.getValue()}
    </Link>
  ),
}),

    columnHelper.accessor("customer", {
      header: "Customer",
      cell: info => (
        <span className="font-bold text-white">
          {info.getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("status", {
      header: "Status",
      cell: info => {
        const status = info.getValue();
        const getStatusColor = (status: string) => {
          switch (status.toLowerCase()) {
            case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/20';
            default: return 'bg-gray-700 text-gray-300';
          }
        };
        
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    }),

    columnHelper.accessor("total", {
      header: "Total",
      cell: info => (
        <span className="font-bold text-white">
          {info.getValue()}
        </span>
      ),
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

  // Render function for mobile cards
  const renderMobileCard = (order: Order) => (
    <OrderCard 
      order={mapToCardOrder(order)}
      showActions={true}
    />
  );

  return (
    <div className="h-full flex flex-col">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-500">
            {orders.filter(o => o.status === 'Delivered').length}
          </p>
        </div>
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-500">
            {orders.filter(o => o.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Cancelled</p>
          <p className="text-2xl font-bold text-red-500">
            {orders.filter(o => o.status === 'Cancelled').length}
          </p>
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        renderMobileCard={renderMobileCard}
      />
    </div>
  );
}