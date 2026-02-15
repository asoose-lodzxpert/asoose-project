'use client';

import { useRideStore } from '../store/ride';
import { Navigation } from 'lucide-react';

export function TripInProgress() {
  const rideType = useRideStore((state) => state.rideType);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 md:w-80 bg-white dark:bg-zinc-900 shadow-xl z-20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full animate-pulse">
        <Navigation size={20} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Trip in Progress</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{rideType} Ride</p>
      </div>
    </div>
  );
}