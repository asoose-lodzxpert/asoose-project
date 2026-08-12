"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";
import {
  CustomerOrder,
  OrderService,
  OrdersResult,
} from "@/services/order.service";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const statusClass = (status: string) => {
  if (status === "DELIVERED")
    return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  if (["CANCELLED", "REJECTED"].includes(status))
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  if (["DISPATCHED", "READY"].includes(status))
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
};

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrders = useCallback(async (): Promise<OrdersResult> => {
    if (!session?.accessToken) throw new Error("Authentication required");
    return OrderService.getOrders(page, 20, session.accessToken);
  }, [page, session?.accessToken]);

  const { data, error, isLoading, mutate } = useSWR(
    status === "authenticated" ? ["customer-orders", page] : null,
    fetchOrders,
    { revalidateOnFocus: false },
  );

  const orders = useMemo(() => {
    const rows = data?.orders ?? [];
    return statusFilter
      ? rows.filter((order) => order.status === statusFilter)
      : rows;
  }, [data?.orders, statusFilter]);

  if (status === "loading" || (isLoading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] dark:bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  const pagination = data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  return (
    <div className="min-h-screen bg-[#f7f7f5] pb-28 text-gray-900 dark:bg-[#0a0a0a] dark:text-white">
      <header className="sticky top-[64px] z-20 border-b border-black/[0.06] bg-[#f7f7f5]/95 px-4 py-4 backdrop-blur-xl dark:border-white/5 dark:bg-[#0a0a0a]/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white dark:border-white/5 dark:bg-[#151515]">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black">Your orders</h1>
            <p className="text-xs text-gray-500">
              {pagination?.total ?? 0} order{pagination?.total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`snap-start whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${statusFilter === option.value ? "border-yellow-500 bg-yellow-500 text-black" : "border-black/[0.06] bg-white text-gray-500 dark:border-white/10 dark:bg-[#151515]"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-red-100 bg-white px-6 text-center dark:border-red-500/10 dark:bg-[#151515]">
            <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
            <p className="text-sm font-bold">Could not load your orders.</p>
            <button type="button" onClick={() => mutate()} className="mt-4 rounded-xl bg-gray-950 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black">
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-black/[0.06] bg-white px-6 text-center dark:border-white/[0.07] dark:bg-[#151515]">
            <Package className="mb-4 h-10 w-10 text-gray-300" />
            <p className="font-black">No orders found</p>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter ? `No ${statusFilter.toLowerCase()} orders on this page.` : "Your purchases will appear here."}
            </p>
            {!statusFilter && (
              <Link href="/main/store" className="mt-5 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black">
                Start shopping
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: CustomerOrder) => (
              <Link key={order.id} href={`/main/orders/${order.id}`} className="group block rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:border-yellow-400/60 hover:shadow-md sm:p-5 dark:border-white/[0.07] dark:bg-[#151515]">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black">{order.orderNumber}</h2>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {order.restaurantName || order.storeName || "Asoose order"} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black">₦{Number(order.total).toLocaleString()}</p>
                    <p className="mt-1 text-[10px] font-bold text-gray-400">{order.paymentMethod === "CARD" ? "PAY ONLINE" : "WALLET"}</p>
                    <ChevronRight className="ml-auto mt-2 h-4 w-4 text-gray-300 transition group-hover:text-yellow-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1} className="rounded-xl border border-black/[0.08] bg-white py-3 text-xs font-bold disabled:opacity-40 dark:border-white/10 dark:bg-[#151515]">
              Previous
            </button>
            <button type="button" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page === totalPages} className="rounded-xl bg-gray-950 py-3 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-black">
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
