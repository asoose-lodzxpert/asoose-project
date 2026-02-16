'use client';
import { useRideStore } from '../store/ride';
import { AlertTriangle, X } from 'lucide-react';

export function GlobalErrorBanner() {
  const geolocationError = useRideStore((s) => s.geolocationError);
  const setGeolocationError = useRideStore((s) => s.setGeolocationError);

  if (!geolocationError) return null;

  return (
    <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-50 animate-in slide-in-from-top-2 pointer-events-auto">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-xl shadow-lg flex items-start gap-3">
        <AlertTriangle className="shrink-0 mt-0.5" size={18} />
        <div className="flex-1">
          <h3 className="font-bold text-sm">Location Error</h3>
          <p className="text-sm opacity-90">{geolocationError}</p>
        </div>
        <button 
          onClick={() => setGeolocationError(null)}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}