'use client';

import { useRideStore } from "../store/ride";
import { Loader2 } from "lucide-react";

export function FindingDriver() {
  const pickupLocation = useRideStore((state) => state.pickupLocation);

  return (
    <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-yellow-400/20 rounded-full">
           <Loader2 className="animate-spin text-yellow-600 dark:text-yellow-400" size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Connecting you...</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Finding the best driver nearby</p>
        </div>
      </div>
      
      {pickupLocation && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Pickup</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 font-mono">
            {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
          </p>
        </div>
      )}
      
      <div className="mt-6 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 w-1/3 animate-indeterminate-bar rounded-full"></div>
      </div>
    </div>
  );
}