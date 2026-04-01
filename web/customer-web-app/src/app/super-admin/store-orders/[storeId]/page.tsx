"use client";

import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import Swal from "sweetalert2";
import { formatDateTime } from "@/utils/formatDate";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  ChefHat,
  BadgeCheck,
  Clock,
  Package,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  User,
  Phone,
  CalendarDays,
  Receipt,
  Bike,
  ShieldAlert,
} from "lucide-react";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch";
import { Currency } from "@/app/main/components/Currency";

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  nameSnap: string;
  quantity: number;
  price: number;
  modifierGroups?: {
    id: string;
    name: string;
    modifiers: { id: string; name: string; price: number }[];
  }[];
}

interface Order {
  id: string;
  status: string;
  total: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; phone?: string; image?: string };
  delivery?: { status: string; riderId?: string } | null;
  items: OrderItem[];
}

interface OrdersResponse {
  data: Order[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  CONFIRMED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PREPARING: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  READY: "bg-green-500/10 text-green-400 border-green-500/30",
  DISPATCHED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  DELIVERED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  CONFIRMED: <CheckCircle2 className="w-3.5 h-3.5" />,
  PREPARING: <ChefHat className="w-3.5 h-3.5" />,
  READY: <BadgeCheck className="w-3.5 h-3.5" />,
  DISPATCHED: <Bike className="w-3.5 h-3.5" />,
  DELIVERED: <Package className="w-3.5 h-3.5" />,
  CANCELLED: <XCircle className="w-3.5 h-3.5" />,
  REJECTED: <XCircle className="w-3.5 h-3.5" />,
};

const ALL_TABS = [
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "CONFIRMED,PREPARING,READY,DISPATCHED" },
  { label: "History", value: "DELIVERED,CANCELLED,REJECTED" },
  { label: "All", value: "all" },
];

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAccept,
  onDecline,
  onPreparing,
  onReady,
  actionLoading,
}: {
  order: Order;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onPreparing: (id: string) => void;
  onReady: (id: string) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === order.id;


  const isLate =
    ["PENDING", "CONFIRMED", "PREPARING"].includes(order.status) &&
    Date.now() - new Date(order.createdAt).getTime() > 45 * 60000;

  const isPaymentCompleted = order.paymentStatus === "COMPLETED" || order.paymentStatus === "PAID";

  return (
    <div
      className={`bg-[#1E293B] border rounded-2xl overflow-hidden transition-all ${isLate
          ? "border-orange-500/50 shadow-orange-500/10 shadow-lg"
          : "border-gray-800"
        }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Customer avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
            {order.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.user.image}
                alt={order.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {order.user.name}
            </p>
            {order.user.phone && (
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {order.user.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_COLORS[order.status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}
          >
            {STATUS_ICONS[order.status]}
            {order.status}
          </span>
          {isLate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
              <AlertTriangle className="w-3 h-3" /> Late
            </span>
          )}
          {!isPaymentCompleted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/30">
              <AlertTriangle className="w-3 h-3" /> UNPAID
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2 border-b border-gray-800/60">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-white text-sm font-medium">
                <span className="text-yellow-400 font-bold">
                  {item.quantity}×
                </span>{" "}
                {item.nameSnap}
              </p>
              {item.modifierGroups?.map((g) => (
                <p key={g.id} className="text-gray-500 text-xs mt-0.5 pl-4">
                  {g.modifiers.map((m) => m.name).join(", ")}
                </p>
              ))}
            </div>
            <p className="text-gray-300 text-sm font-mono shrink-0">
              <Currency amount={item.price * item.quantity} />
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {formatDateTime(order.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            <Currency amount={order.total} />
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 shrink-0 items-end">
          {!isPaymentCompleted && !["DELIVERED", "CANCELLED", "REJECTED"].includes(order.status) && (
            <div className="bg-amber-500/10 border border-amber-500/50 px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-amber-500 text-[10px] w-full max-w-[180px]">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span className="font-bold">Payment pending.</span>
            </div>
          )}
          <div className="flex gap-2">
            {order.status === "PENDING" && (
              <>
                <button
                  onClick={() => onDecline(order.id)}
                  disabled={isLoading || !isPaymentCompleted}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Decline"
                  )}
                </button>
                <button
                  onClick={() => onAccept(order.id)}
                  disabled={isLoading || !isPaymentCompleted}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500 text-white hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Accept"
                  )}
                </button>
              </>
            )}

            {order.status === "CONFIRMED" && (
              <button
                onClick={() => onPreparing(order.id)}
                disabled={isLoading || !isPaymentCompleted}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <ChefHat className="w-3.5 h-3.5 inline mr-1" />
                    Start Preparing
                  </>
                )}
              </button>
            )}

            {(order.status === "PREPARING" || order.status === "CONFIRMED") && (
              <button
                onClick={() => onReady(order.id)}
                disabled={isLoading || !isPaymentCompleted}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <BadgeCheck className="w-3.5 h-3.5 inline mr-1" />
                    Mark Ready
                  </>
                )}
              </button>
            )}

            {[
              "DELIVERED",
              "CANCELLED",
              "REJECTED",
              "READY",
              "DISPATCHED",
            ].includes(order.status) && (
                <span className="px-3 py-1.5 text-xs text-gray-600 italic">
                  No actions
                </span>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StoreOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params?.storeId as string;

  const [activeTab, setActiveTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch store info to verify it's admin-managed and get the name
  const { data: storeInfo } = useSWR<{
    name: string;
    isAdminManaged: boolean;
    id: string;
  }>(storeId ? `/super-admin/vendors/${storeId}` : null, fetcher);

  // Build status query param
  const statusParam = activeTab !== "all" ? activeTab : undefined;
  const queryKey = storeId
    ? `/super-admin/orders/store/${storeId}?page=${page}&limit=20${statusParam ? `&status=${statusParam}` : ""}`
    : null;

  const { data, isLoading, mutate } = useSWR<OrdersResponse>(
    queryKey,
    fetcher,
    {
      refreshInterval: 30000, // auto-refresh every 30s
      revalidateOnFocus: true,
    },
  );

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  // ── Action Handlers ──
  const doAction = async (
    orderId: string,
    endpoint: string,
    body?: Record<string, any>,
  ) => {
    setActionLoading(orderId);
    try {
      await fetcher(`/super-admin/orders/store/${orderId}/${endpoint}`, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      });
      mutate();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: err.message || "Could not complete action",
        background: "#1E293B",
        color: "#fff",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = (id: string) => doAction(id, "accept");

  const handleDecline = async (id: string) => {
    const { value: reason } = await Swal.fire({
      title: "Decline Order",
      input: "text",
      inputLabel: "Reason for declining",
      inputPlaceholder: "e.g. Out of stock, store closed...",
      showCancelButton: true,
      confirmButtonText: "Decline",
      confirmButtonColor: "#ef4444",
      background: "#1E293B",
      color: "#fff",
    });
    if (reason !== undefined) {
      doAction(id, "decline", { reason: reason || "Admin declined" });
    }
  };

  const handlePreparing = (id: string) => doAction(id, "preparing");
  const handleReady = (id: string) => doAction(id, "ready");

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-[#0F172A]/95 backdrop-blur border-b border-gray-800 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white truncate">
                {storeInfo?.name ?? "Store"} — Orders
              </h1>
              {storeInfo?.isAdminManaged && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <ShieldAlert className="w-3 h-3" /> Admin Managed
                </span>
              )}
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Managing orders on behalf of the vendor
            </p>
          </div>

          <button
            onClick={() => mutate()}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="max-w-5xl mx-auto mt-4 flex gap-1 overflow-x-auto hide-scrollbar">
          {ALL_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab.value
                  ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                  : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
            >
              {tab.label}
              {tab.value === "PENDING" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* Not admin managed warning */}
        {storeInfo && !storeInfo.isAdminManaged && (
          <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-300">
                Store is not in Admin-Managed mode
              </p>
              <p className="text-xs text-orange-400/80 mt-1">
                Order actions (accept/decline/etc.) will be blocked by the
                backend. Enable admin-managed mode on the vendor detail page
                first.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            <p className="text-gray-500 text-sm">Loading orders...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-600">
            <ShoppingBag className="w-12 h-12 opacity-40" />
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-xs opacity-60">
              {activeTab === "PENDING"
                ? "No pending orders right now."
                : "No orders match this filter."}
            </p>
          </div>
        )}

        {/* Order Grid */}
        {!isLoading && orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onPreparing={handlePreparing}
                onReady={handleReady}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <span className="text-xs text-gray-500">
              {(page - 1) * meta.limit + 1}–
              {Math.min(page * meta.limit, meta.total)} of {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 px-2">
                {page} / {meta.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
