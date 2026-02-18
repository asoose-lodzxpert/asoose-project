'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RideService } from '@/services/ride.service';
import { mapRidesToViewModels } from '@/services/mappers/ride.mapper';
import type { RideViewModel } from '@/types/ride-view-model';
import { Loader2, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  formatRideDateTime,
  formatCurrency,
} from '@/services/formatters/ride-status.formatter';

export function RideHistoryClient() {
  const { data: session } = useSession();
  const [rides, setRides] = useState<RideViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        // Fetch raw rides from backend
        const backendRides = await RideService.getRideHistory(session.accessToken);
        
        // Transform to ViewModels for consistent handling
        const viewModels = mapRidesToViewModels(Array.isArray(backendRides) ? backendRides : []);
        
        // Sort by newest first
        const sorted = viewModels.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRides(sorted);
      } catch (error) {
        console.error("Failed to load ride history:", error);
        toast.error("Could not load ride history.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [session?.accessToken]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-2xl text-center">
        <div className="bg-zinc-50 dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-100 dark:border-zinc-800">
           <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-zinc-400" size={32} />
           </div>
           <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No rides yet</h3>
           <p className="text-zinc-500 dark:text-zinc-400">Your completed trips will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      <h1 className="text-2xl font-black mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <Clock className="mb-1" /> Ride History
      </h1>
      
      <div className="space-y-4">
        {rides.map((ride) => (
          <div 
            key={ride.id} 
            className="p-5 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            {/* Header: Date & Status */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Calendar size={14} />
                <span>{formatRideDateTime(ride.createdAt.toISOString())}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(ride.status)}`}>
                {ride.statusLabel}
              </span>
            </div>

            {/* Locations */}
            <div className="relative pl-4 space-y-6 mb-4">
               {/* Connecting Line */}
               <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-zinc-100 dark:bg-zinc-800" />
               
               {/* Pickup */}
               <div className="relative">
                  <div className="absolute -left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-black dark:bg-white border-2 border-white dark:border-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700" />
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Pickup</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white line-clamp-1">
                    {ride.pickupAddress.addressText}
                  </p>
               </div>

               {/* Dropoff */}
               <div className="relative">
                  <div className="absolute -left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-black dark:bg-white border-2 border-white dark:border-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700" />
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Dropoff</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white line-clamp-1">
                    {ride.dropoffAddress.addressText}
                  </p>
               </div>
            </div>

            {/* Footer: Price & Details */}
            <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                 {ride.driver && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Driven by <span className="font-bold text-zinc-900 dark:text-white">{ride.driver.name}</span>
                    </div>
                 )}
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-zinc-900 dark:text-white">
                  {formatCurrency(ride.actualFare)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}