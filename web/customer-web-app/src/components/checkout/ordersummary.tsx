'use client';

import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

interface OrderSummaryProps {
  cartTotal: number;
  deliveryFee: number;
  serviceFee: number;
  isProcessing: boolean;
  isDisabled: boolean;
  onPlaceOrder: () => void;
  retryCount: number;
}

export const OrderSummary = ({
  cartTotal,
  deliveryFee,
  serviceFee,
  isProcessing,
  isDisabled,
  onPlaceOrder,
  retryCount,
}: OrderSummaryProps) => {
  const grandTotal = cartTotal + deliveryFee + serviceFee;

  return (
    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <h3 className="font-bold text-lg mb-6">Payment Details</h3>
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
        * Final delivery fee is calculated by the server based on exact GPS distance.
      </p>

      <button
        onClick={onPlaceOrder}
        disabled={isDisabled}
        className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing{retryCount > 0 ? ` (${retryCount})` : ''}...
          </>
        ) : (
          <>
            Place Order
            <ShieldCheck className="w-5 h-5 opacity-50" />
          </>
        )}
      </button>
    </div>
  );
};