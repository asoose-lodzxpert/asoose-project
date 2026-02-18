'use client';

import { useRideStore } from "../store/ride";
import { MapPin, ArrowLeft } from "lucide-react";

export function LocationSelector() {
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const setIsConfiguring = useRideStore((state) => state.setIsConfiguring);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  
  // Note: We REMOVED setRideStatus. 
  // We want to return to 'idle' (RideSelection) to show prices/cars.

  const handleConfirm = () => {
    // Stop configuring. This hides LocationSelector and shows RideSelection
    setIsConfiguring(null); 
  };

  return (
    <div className="flex flex-col justify-between h-full p-6 animate-in slide-in-from-left-5">
      <div>
        <button 
            onClick={() => setIsConfiguring(null)} 
            className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
            <ArrowLeft size={16} /> Back to options
        </button>

        <h1 className="text-2xl font-black tracking-tight mb-2 text-zinc-900 dark:text-white">Pin Location</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          Drag the map to position the pin precisely.
        </p>
        
        <div className="flex flex-col space-y-4">
          {/* Pickup Selection Button */}
          <button
            className={`p-4 rounded-xl text-left border-2 transition-all group w-full ${
              isConfiguring === 'pickup' 
              ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800' 
              : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setIsConfiguring('pickup')}
          >
            <div className="flex items-center gap-3 mb-1">
              <MapPin size={18} className={isConfiguring === 'pickup' ? "text-black dark:text-white" : "text-zinc-400"} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">Pickup Location</h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 pl-8 truncate font-mono">
              {pickupLocation ? `${pickupLocation.lat.toFixed(5)}, ${pickupLocation.lng.toFixed(5)}` : 'Tap to set'}
            </p>
          </button>

          {/* Dropoff Selection Button */}
          <button
            className={`p-4 rounded-xl text-left border-2 transition-all group w-full ${
              isConfiguring === 'dropoff' 
              ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800' 
              : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setIsConfiguring('dropoff')}
          >
             <div className="flex items-center gap-3 mb-1">
              <MapPin size={18} className={isConfiguring === 'dropoff' ? "text-black dark:text-white" : "text-zinc-400"} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">Dropoff Location</h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 pl-8 truncate font-mono">
              {dropoffLocation ? `${dropoffLocation.lat.toFixed(5)}, ${dropoffLocation.lng.toFixed(5)}` : 'Tap to set'}
            </p>
          </button>
        </div>
      </div>

      <button
        className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!pickupLocation && !dropoffLocation}
        onClick={handleConfirm}
      >
        Confirm Locations
      </button>
    </div>
  );
}