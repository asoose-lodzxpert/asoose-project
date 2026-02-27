"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock } from "lucide-react";
import Link from "next/link";
import { OrderTimeline } from "@/app/main/components/order/OrderTimeline";

/**
 * The inner content that consumes search params.
 * Wrapped in Suspense to follow Next.js client-side navigation rules.
 */
function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  // Format the order ID for display (first 8 chars)
  const displayId = orderId
    ? `#${orderId.slice(0, 8).toUpperCase()}`
    : "#ORDER-CONFIRMED";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-6">
        {/* 1. SUCCESS HEADER */}
        <div className="text-center space-y-4 pt-8 md:pt-0">
          <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-green-500/30 animate-in zoom-in duration-500">
            <Check className="w-10 h-10 text-white stroke-[3px]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Order Confirmed!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
              We're preparing your order
            </p>
          </div>
        </div>

        {/* 2. ORDER DETAILS CARD */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
          {/* Order Number Banner */}
          <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
              Order Number
            </span>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5 tracking-tight">
              {displayId}
            </p>
          </div>

          {/* Delivery Estimate Banner */}
          <div className="bg-yellow-500 text-black p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-yellow-500/20">
            <Clock className="w-5 h-5" />
            <span>Delivery estimate sent to email</span>
          </div>
        </div>

        {/* 3. TIMELINE SECTION */}
        <div className="px-2">
          <OrderTimeline status="PENDING" />
        </div>

        {/* 4. ACTIONS */}
        <div className="pb-8 space-y-3">
          {orderId && (
            <Link href={`/main/orders/${orderId}`} className="block w-full">
              <button className="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl shadow-lg hover:bg-yellow-400 transition-all active:scale-[0.98]">
                View Order Details
              </button>
            </Link>
          )}

          <Link href="/main/store" className="block w-full">
            <button className="w-full py-4 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl shadow hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-[0.98]">
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Page Component
 */
export default function ConfirmedOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
