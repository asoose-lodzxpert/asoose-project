"use client";

import React from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { PAYMENT_METHODS } from "../../ride/constants/config";

interface OrderSummaryProps {
  cartTotal: number;
  deliveryFee: number;
  serviceFee: number;
  isProcessing: boolean;
  isDisabled: boolean;
  onPlaceOrder: () => void;
  retryCount: number;
  // ✅ FIX: Allow null for initial state
  selectedMethod: (typeof PAYMENT_METHODS)[number] | null;
  onSelectMethod: (method: (typeof PAYMENT_METHODS)[number]) => void;
}

export const OrderSummary = ({
  cartTotal,
  deliveryFee,
  serviceFee,
  isProcessing,
  isDisabled,
  onPlaceOrder,
  retryCount,
  selectedMethod,
  onSelectMethod,
}: OrderSummaryProps) => {
  const grandTotal = cartTotal + deliveryFee + serviceFee;

  return (
    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <h3 className="font-bold text-lg mb-4">Payment Method</h3>
      <div className="space-y-3 mb-6">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod?.id === method.id;
          return (
            <button
              key={method.id}
              onClick={() => onSelectMethod(method)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isSelected
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 ring-1 ring-yellow-500"
                  : "border-gray-200 dark:border-white/10 hover:border-yellow-500/50"
              }`}
            >
              <div
                className={`p-2 rounded-full ${isSelected ? "bg-yellow-500 text-black" : "bg-gray-100 dark:bg-white/10"}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-bold flex-1 text-left">{method.label}</span>
              {isSelected && (
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="my-4 border-t border-dashed border-gray-200 dark:border-white/10" />

      <h3 className="font-bold text-lg mb-4">Summary</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Subtotal</span>
          <span>₦{cartTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Delivery Fee *</span>
          <span>₦{deliveryFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Service Fee (5%)</span>
          <span>₦{serviceFee.toLocaleString()}</span>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-gray-200 dark:border-white/10" />

      <div className="flex justify-between items-center mb-2">
        <span className="font-black text-lg">Estimated Total</span>
        <span className="font-black text-2xl text-yellow-600 dark:text-yellow-500">
          ₦{grandTotal.toLocaleString()}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-6">
        * Final delivery fee is calculated by the server based on exact GPS
        distance.
      </p>

      <button
        onClick={onPlaceOrder}
        // ✅ FIX: Disable if no method selected
        disabled={isDisabled || !selectedMethod}
        className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {/* ✅ FIX: Dynamic button text */}
            {selectedMethod
              ? `Pay with ${selectedMethod.label}`
              : "Select Payment Method"}
            <ShieldCheck className="w-5 h-5 opacity-50" />
          </>
        )}
      </button>
    </div>
  );
};
