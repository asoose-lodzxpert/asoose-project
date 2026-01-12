'use client';

import React from 'react';
import { Info, Zap, Tag } from 'lucide-react';
import { PriceBreakdown } from '@/services/ride.service';

interface FareBreakdownProps {
  breakdown: PriceBreakdown;
  rideType: string;
}

export default function FareBreakdown({ breakdown, rideType }: FareBreakdownProps) {
  return (
    <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-4 mt-4 animate-in fade-in slide-in-from-top-2 border dark:border-zinc-800 transition-colors duration-300">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Fare Breakdown <Info size={14} className="text-gray-400 dark:text-zinc-600" />
        </h4>
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">{rideType} Ride</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-zinc-400">Base Fare</span>
          <span className="font-medium dark:text-zinc-200">₦{breakdown.baseFare.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-zinc-400">Distance & Time</span>
          <span className="font-medium dark:text-zinc-200">₦{breakdown.distanceRate.toLocaleString()}</span>
        </div>

        {breakdown.surgeMultiplier > 1 && (
          <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <span className="flex items-center gap-1 font-semibold">
              <Zap size={14} fill="currentColor" /> Surge Pricing (x{breakdown.surgeMultiplier})
            </span>
            <span className="font-bold">Included</span>
          </div>
        )}

        {breakdown.promotionDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1 font-medium">
              <Tag size={14} /> Promotion Applied
            </span>
            <span className="font-bold">-₦{breakdown.promotionDiscount.toLocaleString()}</span>
          </div>
        )}

        <div className="h-px bg-gray-200 dark:bg-zinc-800 my-2" />

        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900 dark:text-white">Estimated Total</span>
          <span className="text-xl font-black text-gray-900 dark:text-white">₦{breakdown.total.toLocaleString()}</span>
        </div>
      </div>
      
      <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-3 leading-tight">
        Fares are estimates and may vary based on traffic, tolls, and other factors.
      </p>
    </div>
  );
}