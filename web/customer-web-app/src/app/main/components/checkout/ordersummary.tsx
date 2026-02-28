"use client";

import React from "react";
import { Loader2, ShieldCheck, CreditCard } from "lucide-react";

interface OrderSummaryProps {
  cartTotal: number;
  deliveryFee: number | null;
  serviceFee: number | null;
  vatAmount?: number | null;
  isProcessing: boolean;
  isDisabled: boolean;
  isLoadingFee?: boolean;
  hasAddress?: boolean;
  onPlaceOrder: () => void;
  retryCount: number;
}

export const OrderSummary = ({
  cartTotal,
  deliveryFee,
  serviceFee,
  vatAmount,
  isProcessing,
  isDisabled,
  isLoadingFee = false,
  hasAddress = false,
  onPlaceOrder,
}: OrderSummaryProps) => {
  const resolvedDelivery = deliveryFee ?? 0;
  const resolvedService = serviceFee ?? Math.round(cartTotal * 0.05);
  const resolvedVat = vatAmount ?? Math.round(cartTotal * 0.07);
  const grandTotal =
    cartTotal + resolvedDelivery + resolvedService + resolvedVat;

  return (
    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      {/* Fixed payment method */}
      <h3 className="font-bold text-lg mb-3">Payment</h3>
      <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 mb-6">
        <div className="p-2 rounded-full bg-yellow-500 text-black">
          <CreditCard className="w-5 h-5" />
        </div>
        <span className="font-bold flex-1">Paystack</span>
        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
      </div>

      <div className="my-4 border-t border-dashed border-gray-200 dark:border-white/10" />

      <h3 className="font-bold text-lg mb-4">Summary</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Subtotal</span>
          <span>₦{cartTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Delivery Fee</span>
          {isLoadingFee ? (
            <span className="w-16 h-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          ) : (
            <span>₦{resolvedDelivery.toLocaleString()}</span>
          )}
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Service Fee (5%)</span>
          {isLoadingFee ? (
            <span className="w-12 h-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          ) : (
            <span>₦{resolvedService.toLocaleString()}</span>
          )}
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>VAT (7%)</span>
          {isLoadingFee ? (
            <span className="w-12 h-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          ) : (
            <span>₦{resolvedVat.toLocaleString()}</span>
          )}
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-gray-200 dark:border-white/10" />

      <div className="flex justify-between items-center mb-2">
        <span className="font-black text-lg">Estimated Total</span>
        {isLoadingFee ? (
          <span className="w-24 h-7 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <span className="font-black text-2xl text-yellow-600 dark:text-yellow-500">
            ₦{grandTotal.toLocaleString()}
          </span>
        )}
      </div>

      {!isLoadingFee && deliveryFee !== null && (
        <p className="text-xs text-gray-400 mb-6">
          Delivery fee calculated based on GPS distance from stores to your
          address.
        </p>
      )}
      {isLoadingFee && (
        <p className="text-xs text-gray-400 mb-6">Calculating delivery fee…</p>
      )}
      {!isLoadingFee && deliveryFee === null && (
        <p className="text-xs text-gray-400 mb-6">
          {hasAddress
            ? "Could not calculate delivery fee. Try changing your address."
            : "Select an address to see the exact delivery fee."}
        </p>
      )}

      <button
        onClick={onPlaceOrder}
        disabled={isDisabled || isLoadingFee}
        className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay with Paystack
            <ShieldCheck className="w-5 h-5 opacity-50" />
          </>
        )}
      </button>
    </div>
  );
};
