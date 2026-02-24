'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRideStore } from '../store/ride';
import { RideService } from '@/services/ride.service';
import { RefreshCcw, Loader2 } from 'lucide-react';

export function RideSafetyControls() {
  const { data: session } = useSession();
  const resetRide = useRideStore((s) => s.resetRide);
  const rideStatus = useRideStore((s) => s.rideStatus);
  const rideId = useRideStore((s) => s.rideId);
  const [isResetting, setIsResetting] = useState(false);

  // Only show if we are not in the initial clean state
  if (rideStatus === 'idle') return null;

  const handleEmergencyReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    // Cancel on backend before clearing local state so the ride isn't orphaned
    if (rideId && session?.accessToken) {
      try {
        await RideService.cancelRide(rideId, 'Emergency reset', session.accessToken);
      } catch {
        // Silently ignore — still clear local state so user isn't stuck
      }
    }
    resetRide();
    setIsResetting(false);
  };

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto">
      <button
        onClick={handleEmergencyReset}
        disabled={isResetting}
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-xs font-bold px-3 py-2 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-zinc-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Emergency Reset: Cancels and clears all ride data"
      >
        {isResetting
          ? <Loader2 size={14} className="animate-spin" />
          : <RefreshCcw size={14} />}
        Reset Ride
      </button>
    </div>
  );
}