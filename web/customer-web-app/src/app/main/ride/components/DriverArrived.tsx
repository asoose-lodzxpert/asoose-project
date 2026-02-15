'use client';

import { useRideStore } from "../store/ride";
import { User, Car } from "lucide-react";

export function DriverArrived() {
  // FIXED: Correct selector for driver object
  const driver = useRideStore(s => s.driver);
  const setRideStatus = useRideStore(s => s.setRideStatus);

  return (
    <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-5">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-3">
          <Car size={24} />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">Driver Arrived!</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your ride is waiting at the pickup point.</p>
      </div>

      {driver && (
        <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center">
            <User size={20} className="text-zinc-500" />
          </div>
          <div>
            <p className="font-bold text-zinc-900 dark:text-white">{driver.name}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{driver.vehicle.model} • <span className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-xs">{driver.vehicle.licensePlate}</span></p>
          </div>
        </div>
      )}

      <button 
        className="w-full bg-yellow-400 text-black py-3.5 rounded-xl font-bold text-base hover:bg-yellow-300 transition-colors shadow-lg active:scale-[0.98]"
        onClick={() => setRideStatus('in-progress')}
      >
        Confirm Pickup
      </button>
    </div>
  );
}