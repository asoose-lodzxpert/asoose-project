"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { getSession } from "next-auth/react";
import {
  Store,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ChefHat,
  PackageCheck,
  Truck,
  AlertCircle,
  Ban,
  ExternalLink,
  Filter,
} from "lucide-react";
import Swal from "sweetalert2";

const API = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string) => {
  const session = await getSession();
  const token = (session as any)?.accessToken ?? "";
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Fetch failed");
  return r.json();
};

/* ─── Types ─────────────────────────────────────────────────────────────── */
type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  modifierGroups?: { modifiers: { name: string; price: number }[] }[];
}

interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  paymentStatus: string;
  notes?: string;
  store: { id: string; name: string; logo?: string };
  user: { name: string; phone: string; image?: string };
  items: OrderItem[];
  delivery?: { status: string };
}

interface ManagedStore {
  id: string;
  name: string;
  logo?: string;
}

interface OrdersResponse {
  data: Order[];
  meta: { total: number; page: number; limit: number; pages: number };
  managedStores: ManagedStore[];
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const TABS = [
  { key: "all", label: "All", statuses: "" },
  { key: "pending", label: "Pending", statuses: "PENDING" },
  {
    key: "active",
    label: "Active",
    statuses: "CONFIRMED,PREPARING,READY,DISPATCHED",
  },
  {
    key: "history",
    label: "History",
    statuses: "DELIVERED,CANCELLED,REJECTED",
  },
];

const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-500/20 text-yellow-400",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-500/20 text-blue-400",
    icon: CheckCircle,
  },
  PREPARING: {
    label: "Preparing",
    color: "bg-purple-500/20 text-purple-400",
    icon: ChefHat,
  },
  READY: {
    label: "Ready",
    color: "bg-green-500/20 text-green-400",
    icon: PackageCheck,
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-cyan-500/20 text-cyan-400",
    icon: Truck,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-500/20 text-emerald-400",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-400",
    icon: Ban,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-rose-500/20 text-rose-400",
    icon: XCircle,
  },
};

function isLate(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() > 45 * 60 * 1000;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/* ─── Order Card ─────────────────────────────────────────────────────────── */
function OrderCard({
  order,
  onAction,
}: {
  order: Order;
  onAction: () => void;
}) {
  const meta = STATUS_META[order.status];
  const StatusIcon = meta.icon;
  const late = isLate(order.createdAt);
  const isPending = order.status === "PENDING";
  const isConfirmed = order.status === "CONFIRMED";
  const isPreparing = order.status === "PREPARING";
  const isHistory = ["DELIVERED", "CANCELLED", "REJECTED"].includes(
    order.status,
  );

  const apiAction = useCallback(
    async (action: string, reason?: string) => {
      const url = `${API}/super-admin/orders/store/${order.id}/${action}`;
      const session = await getSession();
      const token = (session as any)?.accessToken ?? "";
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Action failed");
      }
      return res.json();
    },
    [order.id],
  );

  const handleAccept = async () => {
    const result = await Swal.fire({
      title: "Accept Order?",
      text: `Accept order from ${order.user.name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Accept",
      confirmButtonColor: "#22c55e",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    try {
      await apiAction("accept");
      Swal.fire({
        title: "Accepted!",
        icon: "success",
        timer: 1500,
        background: "#1e293b",
        color: "#fff",
        showConfirmButton: false,
      });
      onAction();
    } catch (e: any) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
        background: "#1e293b",
        color: "#fff",
      });
    }
  };

  const handleDecline = async () => {
    const result = await Swal.fire({
      title: "Decline Order",
      input: "textarea",
      inputLabel: "Reason for declining",
      inputPlaceholder: "Enter reason...",
      showCancelButton: true,
      confirmButtonText: "Decline",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    try {
      await apiAction("decline", result.value || "Declined by admin");
      Swal.fire({
        title: "Declined",
        icon: "info",
        timer: 1500,
        background: "#1e293b",
        color: "#fff",
        showConfirmButton: false,
      });
      onAction();
    } catch (e: any) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
        background: "#1e293b",
        color: "#fff",
      });
    }
  };

  const handlePreparing = async () => {
    try {
      await apiAction("preparing");
      Swal.fire({
        title: "Preparing!",
        icon: "success",
        timer: 1500,
        background: "#1e293b",
        color: "#fff",
        showConfirmButton: false,
      });
      onAction();
    } catch (e: any) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
        background: "#1e293b",
        color: "#fff",
      });
    }
  };

  const handleReady = async () => {
    try {
      await apiAction("ready");
      Swal.fire({
        title: "Marked Ready!",
        icon: "success",
        timer: 1500,
        background: "#1e293b",
        color: "#fff",
        showConfirmButton: false,
      });
      onAction();
    } catch (e: any) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
        background: "#1e293b",
        color: "#fff",
      });
    }
  };

  return (
    <div
      className={`bg-[#1E293B] rounded-xl border ${isPending ? "border-yellow-500/40" : "border-gray-700/50"} p-5 flex flex-col gap-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </span>
            {late && !isHistory && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Late
              </span>
            )}
          </div>
          {/* Store badge */}
          <Link
            href={`/super-admin/store-orders/${order.store.id}`}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="font-medium">{order.store.name}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
          {order.delivery && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                order.delivery.status === "DELIVERED"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : order.delivery.status === "PICKED_UP"
                    ? "bg-blue-500/20 text-blue-400"
                    : order.delivery.status === "ACCEPTED"
                      ? "bg-sky-500/20 text-sky-400"
                      : order.delivery.status === "ASSIGNED"
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-slate-700 text-slate-400"
              }`}
            >
              🚴 {order.delivery.status}
            </span>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">
          {order.user.image ? (
            <img
              src={order.user.image}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            order.user.name?.[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {order.user.name}
          </p>
          <p className="text-xs text-gray-400">{order.user.phone}</p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-sm font-bold text-white">
            {fmt(order.totalAmount)}
          </p>
          <p className="text-xs text-gray-500">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-[#0F172A]/60 rounded-lg p-3 space-y-2">
        {order.items.map((item) => {
          const mods = item.modifierGroups?.flatMap((g) => g.modifiers) ?? [];
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2"
            >
              <div>
                <p className="text-sm text-white">
                  <span className="text-yellow-400 font-bold">
                    {item.quantity}×
                  </span>{" "}
                  {item.productName}
                </p>
                {mods.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mods.map((m) => m.name).join(", ")}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {fmt(item.price * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {!isHistory && (
        <div className="flex gap-2 pt-1">
          {isPending && (
            <>
              <button
                onClick={handleDecline}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                Accept
              </button>
            </>
          )}
          {isConfirmed && (
            <>
              <button
                onClick={handlePreparing}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-colors"
              >
                Start Preparing
              </button>
              <button
                onClick={handleReady}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                Mark Ready
              </button>
            </>
          )}
          {isPreparing && (
            <button
              onClick={handleReady}
              className="w-full py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
            >
              Mark Ready
            </button>
          )}
          {!isPending && !isConfirmed && !isPreparing && (
            <p className="text-xs text-gray-500 italic">Waiting for rider…</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function StoreOrdersOverviewPage() {
  const [tab, setTab] = useState("all");
  const [selectedStore, setSelectedStore] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const LIMIT = 20;

  const activeTab = TABS.find((t) => t.key === tab)!;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(LIMIT));
  if (activeTab.statuses) params.set("status", activeTab.statuses);
  if (selectedStore) params.set("storeId", selectedStore);

  const swrKey = `${API}/super-admin/orders/store-orders?${params.toString()}&_r=${refreshKey}`;

  const { data, isLoading, mutate } = useSWR<OrdersResponse>(swrKey, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    mutate();
  }, [mutate]);

  // Reset page on tab / store change
  useEffect(() => {
    setPage(1);
  }, [tab, selectedStore]);

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const managedStores = data?.managedStores ?? [];
  const pendingCount =
    tab === "all"
      ? orders.filter((o) => o.status === "PENDING").length
      : tab === "pending"
        ? orders.length
        : 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Store Orders</h1>
              <p className="text-sm text-gray-400">
                All orders across admin-managed stores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-bold">
                {pendingCount} pending
              </span>
            )}
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Store filter + Tabs row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Store filter */}
          <div className="flex items-center gap-2 bg-[#1E293B] border border-gray-700/50 rounded-xl px-3 py-2 min-w-[220px]">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent text-sm text-white outline-none flex-1"
            >
              <option value="">All Managed Stores</option>
              {managedStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#1E293B] border border-gray-700/50 rounded-xl p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
                {t.key === "pending" &&
                  (data?.meta.total ?? 0) > 0 &&
                  tab === "pending" && (
                    <span className="ml-1.5 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                      {data?.meta.total}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Managed stores quick-access strip */}
        {managedStores.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {managedStores.map((s) => (
              <Link
                key={s.id}
                href={`/super-admin/store-orders/${s.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E293B] border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <Store className="w-3.5 h-3.5 text-blue-400" />
                {s.name}
                <ExternalLink className="w-3 h-3 opacity-40" />
              </Link>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-[#1E293B] rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Store className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-lg font-semibold text-gray-400">
              No orders found
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedStore
                ? "This store has no orders in this category."
                : "No admin-managed store orders in this category."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onAction={refresh} />
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <p className="text-sm text-gray-400">
                  Showing {(page - 1) * LIMIT + 1}–
                  {Math.min(page * LIMIT, meta.total)} of {meta.total} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-2 rounded-lg bg-[#1E293B] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-400">
                    {page} / {meta.pages}
                  </span>
                  <button
                    disabled={page === meta.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-lg bg-[#1E293B] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
