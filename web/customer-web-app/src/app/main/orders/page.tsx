"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  Loader2,
  ShoppingBag,
  Store,
  ChevronRight,
  Package,
  Filter,
  AlertCircle,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function statusColor(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    case "CANCELLED":
    case "REJECTED":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
    case "DISPATCHED":
    case "READY":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    default:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-500";
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    async (url: string) => {
      if (status === "unauthenticated") {
        router.push("/sign-in");
        throw new Error("Not authenticated");
      }
      const token =
        (session as any)?.accessToken || (session as any)?.user?.accessToken;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Failed to fetch");
      return res.json();
    },
    [session, status, router],
  );

  const queryKey =
    status === "authenticated"
      ? `${API_URL}/users/orders?page=${page}&pageSize=10${statusFilter ? `&status=${statusFilter}` : ""}`
      : null;

  const { data, error, isLoading } = useSWR(queryKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const orders: any[] = data?.data ?? [];
  const hasMore: boolean = data?.hasMore ?? false;

  if (
    status === "loading" ||
    (status === "authenticated" && isLoading && !data)
  )
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-4 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-white dark:bg-[#151515] rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h1 className="text-xl font-bold flex-1">Order History</h1>
          <Filter className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${
                statusFilter === opt.value
                  ? "bg-yellow-500 text-black border-yellow-500"
                  : "bg-white dark:bg-[#151515] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-yellow-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertCircle className="w-10 h-10 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {error.message || "Failed to load orders"}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-white mb-1">
                No orders yet
              </p>
              <p className="text-sm text-gray-400">
                {statusFilter
                  ? `No ${statusFilter.toLowerCase()} orders found.`
                  : "Start shopping to see your orders here."}
              </p>
            </div>
            <Link
              href="/main/store"
              className="mt-2 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Browse Store
            </Link>
          </div>
        )}

        {/* Order list */}
        <div className="space-y-3">
          {orders.map((order) => {
            const isGroup = order.type === "GROUP";
            return (
              <Link
                href={`/main/orders/${order.id}`}
                key={order.id}
                className="block group"
              >
                <div className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 p-5 hover:border-yellow-400/50 dark:hover:border-yellow-500/30 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-yellow-50 dark:bg-yellow-500/10">
                      {isGroup ? (
                        <Store className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {isGroup
                            ? "Multi-Store Order"
                            : `Order #${order.id.slice(-6).toUpperCase()}`}
                        </span>
                        {isGroup && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                            {order.orderCount} stores
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {isGroup
                          ? (order.stores as string[]).join(" · ")
                          : order.storeName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Right side: status + total + arrow */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        ₦{Number(order.total).toLocaleString("en-NG")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-yellow-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {(orders.length > 0 || page > 1) && (
          <div className="flex items-center justify-between pt-2 pb-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-40 hover:border-yellow-400 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm font-semibold bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-40 hover:border-yellow-400 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {isLoading && data && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
          </div>
        )}
      </div>
    </div>
  );
}
