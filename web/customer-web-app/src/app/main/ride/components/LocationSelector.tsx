'use client';

import { useRideStore } from "../store/ride";
import { MapPin } from "lucide-react";

export function LocationSelector() {
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const setIsConfiguring = useRideStore((state) => state.setIsConfiguring);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const setRideStatus = useRideStore((state) => state.setRideStatus);

  const handleConfirm = () => {
    // STRICT FIX: Must transition to 'searching' to trigger simulation/driver assignment.
    // Previous setting of 'confirmed' skipped the driver finding phase, causing a soft-lock.
    setRideStatus('searching');
  };

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[450px] bg-white dark:bg-zinc-900 shadow-2xl z-20 flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-800 p-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-6 text-zinc-900 dark:text-white">Pin Location</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Click on the map to set your location precisely.</p>
        
        <div className="flex flex-col space-y-4">
          <button
            className={`p-4 rounded-xl text-left border-2 transition-all group ${
              isConfiguring === 'pickup' 
              ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-400/10' 
              : 'border-transparent bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100'
            }`}
            onClick={() => setIsConfiguring('pickup')}
          >
            <div className="flex items-center gap-3 mb-1">
              <MapPin size={18} className={isConfiguring === 'pickup' ? "text-yellow-600 dark:text-yellow-400" : "text-zinc-400"} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">Pickup Location</h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 pl-8 truncate">
              {pickupLocation ? `${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}` : 'Tap on map to set'}
            </p>
          </button>

          <button
            className={`p-4 rounded-xl text-left border-2 transition-all group ${
              isConfiguring === 'dropoff' 
              ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-400/10' 
              : 'border-transparent bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100'
            }`}
            onClick={() => setIsConfiguring('dropoff')}
          >
             <div className="flex items-center gap-3 mb-1">
              <MapPin size={18} className={isConfiguring === 'dropoff' ? "text-yellow-600 dark:text-yellow-400" : "text-zinc-400"} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">Dropoff Location</h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 pl-8 truncate">
              {dropoffLocation ? `${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)}` : 'Tap on map to set'}
            </p>
          </button>
        </div>
      </div>

      <button
        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!pickupLocation || !dropoffLocation}
        onClick={handleConfirm}
      >
        Set Locations
      </button>
    </div>
  );
}