"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  MessageSquare,
  AlertCircle,
  ShoppingBag,
  MapPin,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";

import { OrderTimeline } from "@/app/main/components/order/OrderTimeline";
import ReportDisputeModal from "../component/reportDisputeModal";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const orderId = params.id as string;
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  // Fetcher
  const fetcher = async (url: string) => {
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
      throw new Error((await res.json()).message || "Failed to fetch order");
    return res.json();
  };

  // SWR
  const shouldFetch =
    status === "authenticated" && orderId
      ? `${API_URL}/users/orders/${orderId}`
      : null;
  const {
    data: order,
    error,
    isLoading,
    mutate,
  } = useSWR(shouldFetch, fetcher, {
    refreshInterval: (data) =>
      data && ["DELIVERED", "CANCELLED", "REJECTED"].includes(data.status)
        ? 0
        : 5000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  // Logic
  const { canReport, isExpired, hasDispute } = useMemo(() => {
    if (!order)
      return { canReport: false, isExpired: false, hasDispute: false };
    const hasActiveDispute = !!order.dispute;
    let isPastWindow = false;
    if (order.deliveredAt) {
      const delivered = new Date(order.deliveredAt);
      const window = new Date();
      window.setDate(window.getDate() - 7);
      isPastWindow = delivered < window;
    }
    const eligible = ["DELIVERED", "CANCELLED"].includes(order.status);
    return {
      canReport: eligible && !isPastWindow && !hasActiveDispute,
      isExpired: eligible && isPastWindow && !hasActiveDispute,
      hasDispute: hasActiveDispute,
    };
  }, [order]);

  if (status === "loading" || isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  if (error || !order)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-[#151515] rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Order not found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
          {error?.message ||
            "We couldn't locate the order details you requested."}
        </p>
        <Link
          href="/main/orders"
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      {/* Header / Nav */}
      <div className="sticky top-0 z-20 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-4 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white dark:bg-[#151515] rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Order Details</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              ID: #{order.id.split("-")[0].toUpperCase()}
            </p>
          </div>
          {order.status === "DELIVERED" && (
            <div className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full border border-green-500/20">
              Completed
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black capitalize tracking-tight mb-2">
              {order.status?.replace("_", " ").toLowerCase()}
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              {order.status === "DELIVERED" ? (
                <span>
                  Arrived on {new Date(order.deliveredAt).toLocaleDateString()}
                </span>
              ) : (
                <span>
                  Estimated Arrival:{" "}
                  {order.estimatedArrival || "Calculating..."}
                </span>
              )}
            </div>
          </div>

          <div className="relative py-4">
            <OrderTimeline status={order.status} />
          </div>
        </div>

        {/* Dispute Notice */}
        {hasDispute && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-start justify-between gap-3 border border-red-100 dark:border-red-900/20">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-red-700 dark:text-red-400 text-sm">
                  Dispute Open
                </p>
                <p className="text-xs text-red-600 dark:text-red-300/80 mt-1 capitalize">
                  Status: {order.dispute.status}
                </p>
              </div>
            </div>
            {order.dispute?.id && (
              <Link
                href={`/main/disputes/${order.dispute.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline shrink-0 mt-0.5"
              >
                View <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-yellow-500" />
            Order Summary
          </h3>
          <div className="space-y-4">
            {order.items.map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between items-start py-2 border-b border-gray-50 dark:border-white/5 last:border-0 last:pb-0"
              >
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                    {item.quantity}x
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {item.modifiers.map((m: any) => m.name).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Financials */}
          <div className="pt-4 mt-2 border-t border-dashed border-gray-200 dark:border-white/10 space-y-2">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Subtotal</span>
              <span>
                ₦
                {order.subTotal?.toLocaleString() ||
                  order.total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Delivery Fee</span>
              <span>₦{order.deliveryFee?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-gray-900 dark:text-white pt-2">
              <span>Total</span>
              <span>₦{order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-yellow-500" />
            Delivery Details
          </h3>
          <div className="pl-2 border-l-2 border-gray-100 dark:border-white/10 ml-2 space-y-6">
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gray-200 dark:bg-white/20 border-2 border-white dark:border-[#151515]"></div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                From
              </p>
              <p className="text-sm font-bold">
                {order.store?.name || "Store"}
              </p>
              <p className="text-xs text-gray-500">{order.store?.address}</p>
            </div>
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white dark:border-[#151515]"></div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                To
              </p>
              <p className="text-sm font-bold">
                {order.addressDetails?.address || "Pickup"}
              </p>
              <p className="text-xs text-gray-500">
                {order.addressDetails?.city}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-3">
          <Link
            href={`/main/store`}
            className="w-full py-4 bg-yellow-500 text-black font-bold text-center rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10 block"
          >
            Browse Store
          </Link>

          {canReport && (
            <button
              onClick={() => setIsDisputeModalOpen(true)}
              className="w-full py-4 bg-white dark:bg-[#151515] text-red-500 font-bold rounded-xl border border-gray-100 dark:border-white/5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              Report an Issue
            </button>
          )}

          {isExpired && (
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                Dispute window closed
              </p>
            </div>
          )}
        </div>
      </div>

<ReportDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        referenceId={orderId} // FIXED: Changed from orderId to referenceId
        type="ORDER"          // FIXED: Added required type prop
        onSuccess={() => mutate()}
      />
    </div>
  );
}
