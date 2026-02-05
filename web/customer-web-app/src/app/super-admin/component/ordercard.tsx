"use client";

import React from "react";
import { Eye, MoreVertical } from "lucide-react";
import Link from "next/link";

export type Order = {
  id: string;
  status: string;
  customer: string;
  vendor: string;
  rider: string;
  amount: number;
  type: string;
  placedAt: string;
  updated: string;
};

interface OrderCardProps {
  order: Order;
  className?: string;
  showActions?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Delivered":
      return "bg-green-500/20 text-green-400 border-green-500/20";
    case "Accepted":
      return "bg-blue-500/20 text-blue-400 border-blue-500/20";
    case "Out for Delivery":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/20";
    case "Pending":
      return "bg-yellow-500/20 text-yellow-500 border-yellow-500/20";
    case "Cancelled":
    case "Failed":
      return "bg-red-500/20 text-red-400 border-red-500/20";
    default:
      return "bg-gray-700 text-gray-300";
  }
};

export default function OrderCard({
  order,
  className = "",
  showActions = true,
}: OrderCardProps) {
  return (
    <div
      className={`bg-[#1E293B] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors ${className}`}
    >
      {/* Header: ID + Status */}
      <div className="flex justify-between items-start mb-3">
        <Link
          href={`/super-admin/orders/${order.id}`}
          className="text-yellow-500 hover:text-yellow-400 font-mono font-bold text-sm transition-colors"
        >
          {order.id}
        </Link>
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(order.status)}`}
        >
          {order.status}
        </span>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Customer:</span>
          <Link
            href={`/super-admin/users/customers/`}
            className="font-bold text-white hover:text-yellow-500 transition-colors"
          >
            {order.customer}
          </Link>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Vendor:</span>
          <a
            href={`/super-admin/users/vendors/${order.vendor.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`}
            className="text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            {order.vendor}
          </a>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Rider:</span>
          <span className="text-gray-300">{order.rider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Type:</span>
          <span className="text-gray-300">{order.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount:</span>
          <span className="font-bold text-white">
            ${order.amount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Placed:</span>
          <span className="text-gray-300">{order.placedAt}</span>
        </div>
        {order.updated !== order.placedAt && (
          <div className="flex justify-between">
            <span className="text-gray-500">Updated:</span>
            <span className="text-gray-300">{order.updated}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 pt-3 border-t border-gray-800">
          <Link
            href={`/super-admin/orders/${order.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">View</span>
          </Link>
          <button className="px-4 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
