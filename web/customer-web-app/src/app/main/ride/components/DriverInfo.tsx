'use client';

import { useRideStore } from "../store/ride";
import { Star, Phone, MessageSquare, Loader2 } from "lucide-react";

export function DriverInfo() {
  const driver = useRideStore((state) => state.driver);
  const rideStatus = useRideStore((state) => state.rideStatus);

  if (!driver) return null;

  return (
    <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-20 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
      
      {/* Status Header: Only shown when driver is on the way (confirmed state) */}
      {rideStatus === 'confirmed' && (
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-zinc-100 dark:border-zinc-800">
           <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
             <Loader2 className="animate-spin text-yellow-600 dark:text-yellow-400" size={20} />
           </div>
           <div>
             <h4 className="font-bold text-zinc-900 dark:text-white">Driver is on the way</h4>
             <p className="text-xs text-zinc-500 dark:text-zinc-400">Please wait at the pickup point</p>
           </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
             <img src={driver.photoUrl} alt={driver.name} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
             <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded-full flex items-center shadow-sm border border-zinc-100 dark:border-zinc-700">
                <Star size={10} className="fill-yellow-400 text-yellow-400 mr-1" />
                <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{driver.rating}</span>
             </div>
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{driver.name}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{driver.vehicle.make} {driver.vehicle.model}</p>
            <p className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded inline-block mt-1 text-zinc-600 dark:text-zinc-300">
              {driver.vehicle.licensePlate}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-5">
        <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-sm transition-colors">
          <Phone size={16} /> Call
        </button>
        <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-sm transition-colors">
          <MessageSquare size={16} /> Message
        </button>
      </div>
    </div>
  );
}