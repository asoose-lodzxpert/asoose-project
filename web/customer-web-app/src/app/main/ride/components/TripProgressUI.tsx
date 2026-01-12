'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Clock } from 'lucide-react';

interface TripProgressUIProps {
  destination: string;
  driverName: string;
  driverImage?: string; 
  etaMinutes: number;
}

export default function TripProgressUI({ destination, driverName, etaMinutes }: TripProgressUIProps) {
  const [elapsed, setElapsed] = useState(0);

  // Simple elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col justify-between pointer-events-none md:pointer-events-auto font-sans relative bg-transparent transition-colors duration-300">
      
      {/* --- TOP BANNER --- */}
      <div className="pointer-events-auto mx-4 mt-4 animate-in slide-in-from-top-10 fade-in duration-500">
        <div className="bg-white dark:bg-zinc-900 rounded-full shadow-lg dark:shadow-none border dark:border-zinc-800 p-2 pl-6 pr-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
             <span className="text-emerald-500 dark:text-emerald-400 font-bold text-sm">Trip in Progress</span>
             <span className="text-gray-400 dark:text-zinc-600 text-xs">•</span>
             <span className="text-gray-900 dark:text-white font-bold text-sm">{etaMinutes} mins remaining</span>
          </div>
          
          {/* Driver Pill */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-full px-3 py-1.5">
             <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {driverName.charAt(0)}
             </div>
             <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{driverName}</span>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* --- BOTTOM SHEET --- */}
      <div className="
        pointer-events-auto bg-white dark:bg-[#0a0a0a] rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] 
        dark:shadow-none border-t dark:border-zinc-800
        pb-8 pt-2 relative animate-in slide-in-from-bottom-20 duration-500
        md:rounded-3xl md:m-4 md:shadow-2xl md:border
      ">
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mt-3 mb-6" />

        <div className="px-6 flex items-center justify-between pb-4">
          <div className="flex-1 mr-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">{destination}</h2>
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
               <Clock size={14} />
               <span className="text-sm font-medium">{formatTime(elapsed)} elapsed</span>
            </div>
          </div>

          {/* Safety Button */}
          <button 
            className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition active:scale-95 group"
            aria-label="Safety Alert"
          >
             <ShieldAlert className="text-red-600 dark:text-red-500 fill-red-600/20 group-hover:scale-110 transition" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}