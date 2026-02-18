'use client';

import { useRideStore } from '../store/ride';
import { CheckCircle2 } from 'lucide-react';

export function TripComplete() {
  const tripSummary = useRideStore((state) => state.tripSummary);

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-zinc-100 dark:border-zinc-800 text-center animate-in zoom-in-95 duration-200">
        
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
          <CheckCircle2 size={32} />
        </div>

        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">You arrived!</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">Hope you enjoyed your ride.</p>
        
        {tripSummary && (
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 space-y-4 mb-6">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700 pb-4">
              <span className="text-zinc-500 dark:text-zinc-400">Total Fare</span>
              <span className="text-2xl font-black text-zinc-900 dark:text-white">${tripSummary.fare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Distance</span>
              <span className="font-bold text-zinc-900 dark:text-white">{tripSummary.distance.toFixed(2)} miles</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Duration</span>
              <span className="font-bold text-zinc-900 dark:text-white">{tripSummary.duration.toFixed(0)} min</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}