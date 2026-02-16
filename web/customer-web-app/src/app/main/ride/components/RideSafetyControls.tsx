'use client';
import { useRideStore } from '../store/ride';
import { RefreshCcw } from 'lucide-react';

export function RideSafetyControls() {
  const resetRide = useRideStore((s) => s.resetRide);
  const rideStatus = useRideStore((s) => s.rideStatus);

  // Only show if we are not in the initial clean state
  if (rideStatus === 'idle') return null;

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto">
      <button
        onClick={resetRide}
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-xs font-bold px-3 py-2 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-zinc-500 hover:text-red-500"
        title="Emergency Reset: Clears all ride data"
      >
        <RefreshCcw size={14} />
        Reset Ride
      </button>
    </div>
  );
}