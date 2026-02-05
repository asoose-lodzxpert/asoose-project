"use client";

import React from "react";
import { X, Loader2 } from "lucide-react";

interface FindingDriverUIProps {
  onCancel: () => void;
  pickupAddress: string;
  dropoffAddress: string;
}

export default function FindingDriverUI({
  onCancel,
  pickupAddress,
  dropoffAddress,
}: FindingDriverUIProps) {
  return (
    <div className="h-full flex flex-col justify-end pointer-events-none md:p-6 font-sans">
      <div className="pointer-events-auto bg-white dark:bg-[#0a0a0a] rounded-t-3xl shadow-2xl p-6 md:rounded-3xl md:shadow-none w-full animate-in slide-in-from-bottom-10 border border-gray-100 dark:border-zinc-800">
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-emerald-50 dark:bg-emerald-900/50 rounded-full p-4">
              <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Finding your driver
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Connecting you with nearby drivers...
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
            <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 truncate">
              {pickupAddress || "Current Location"}
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl">
            <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
            <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 truncate">
              {dropoffAddress || "Destination"}
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
        >
          <X size={18} /> Cancel Request
        </button>
      </div>
    </div>
  );
}
