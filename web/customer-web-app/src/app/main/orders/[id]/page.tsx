"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Clock,
  MapPin,
  Loader2,
  ChevronLeft,
  AlertCircle,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import useSWR from "swr"; //

import { OrderTimeline } from "@/app/main/components/order/OrderTimeline";
import ReportDisputeModal from "../component/reportDisputeModal";
import { createClient } from "../../../../../utils/supabase/client";
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/sign-in");
      throw new Error("Not authenticated");
    }
    const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch order");
    return res.json();
  };

  // 2. SWR Implementation with Polling
  // refreshInterval: Polls every 10s unless the order is DELIVERED or CANCELLED
  const {
    data: order,
    error,
    isLoading,
    mutate,
  } = useSWR(orderId ? `${API_URL}/users/orders/${orderId}` : null, fetcher, {
    refreshInterval: (data) =>
      data && ["DELIVERED", "CANCELLED"].includes(data.status) ? 0 : 10000,
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

    const eligibleStatus = ["DELIVERED", "CANCELLED"].includes(order.status);

    return {
      canReport: eligibleStatus && !isPastWindow && !hasActiveDispute,
      isExpired: eligibleStatus && isPastWindow && !hasActiveDispute,
      hasDispute: hasActiveDispute,
    };
  }, [order]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );

  if (error || !order)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-4 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold">
          {error?.message || "Order not found"}
        </h2>
        <Link href="/profile" className="text-yellow-500 font-bold mt-2">
          Back to my orders
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center p-4 pb-24 transition-colors duration-300">
      {/* Navigation Header */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white dark:bg-white/5 rounded-full shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
            Order Reference
          </p>
          <p className="text-xs font-bold font-mono">
            #{order.id.split("-")[0].toUpperCase()}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Status Badge */}
        <div className="text-center space-y-3">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-colors duration-500 ${
              order.status === "DELIVERED"
                ? "bg-green-500 shadow-green-500/20"
                : "bg-yellow-500 shadow-yellow-500/20"
            }`}
          >
            <Check className="w-10 h-10 text-white stroke-[3px]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight italic">
              {order.status.replace("_", " ")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {order.status === "DELIVERED"
                ? "Package received safely"
                : "Real-time status tracking active"}
            </p>
          </div>
        </div>

        {/* Integrated Timeline */}
        <div className="mb-12 opacity-90">
            <OrderTimeline status={order.status} />
        </div>

        {/* Dispute Notice */}
        {hasDispute && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-[2rem] flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                Issue Under Review
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/60 font-medium mt-0.5">
                Status:{" "}
                <span className="font-bold">{order.dispute.status}</span>
              </p>
            </div>
          </div>
        )}

        {/* Order Summary Card */}
        <div className="bg-white dark:bg-[#151515] rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">
                Order Items
              </h3>
              <span className="text-xs font-bold text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-lg">
                {order.items.length}{" "}
                {order.items.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xs font-black">
                      {item.quantity}x
                    </div>
                    <span className="text-sm font-bold opacity-90">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold">
                    ₦{item.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-dashed border-gray-200 dark:border-white/10 flex justify-between items-center">
            <span className="text-sm font-black text-gray-400">
              GRAND TOTAL
            </span>
            <span className="text-xl font-black text-yellow-500 tracking-tighter">
              ₦{order.total.toLocaleString()}
            </span>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-3xl">
            <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Delivery To
              </p>
              <p className="text-xs font-bold line-clamp-1">
                {order.addressDetails?.address}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/store"
            className="block w-full bg-yellow-500 text-black py-4 rounded-full font-black text-center shadow-xl shadow-yellow-500/20 active:scale-[0.98] transition-all"
          >
            Order Again
          </Link>

          {canReport ? (
            <button
              onClick={() => setIsDisputeModalOpen(true)}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 py-4 rounded-full font-black transition-all flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Report a Problem
            </button>
          ) : isExpired ? (
            <div className="text-center p-4">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                Dispute window closed (7 days exceeded)
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <ReportDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        orderId={orderId}
        onSuccess={() => mutate()} // Refresh data after reporting
      />
    </div>
  );
}
