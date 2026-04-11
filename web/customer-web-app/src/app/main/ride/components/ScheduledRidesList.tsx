'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Loader2,
  Car,
  MapPin
} from 'lucide-react';
import { ScheduledRideService } from '@/services/scheduled-ride.service';
import { toast } from 'react-toastify';
import { SidebarSection, SidebarDivider } from './Sidebar';
import { useRideStore } from '../store/ride';

export function ScheduledRidesList() {
  const [rides, setRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const setActiveTab = useRideStore((state) => state.setActiveTab);
  const setBookingStage = useRideStore((state) => state.setBookingStage);

  const fetchRides = useCallback(async () => {
    try {
      const data = await ScheduledRideService.getUpcomingRides();
      setRides(data);
    } catch (err: any) {
      toast.error('Failed to load upcoming rides');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleCancel = async (rideId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled ride?')) return;
    
    setIsDeleting(rideId);
    try {
      await ScheduledRideService.cancelRide(rideId);
      toast.success('Ride cancelled');
      setRides(prev => prev.filter(r => r.id !== rideId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel ride');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBookNew = () => {
    setActiveTab('scheduled');
    setBookingStage('LOCATION');
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-yellow-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SidebarSection title="Upcoming Rides">
        {rides.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-bold dark:text-white">No upcoming rides</p>
              <p className="text-xs text-zinc-500 mt-1">Book your first trip to see it here.</p>
            </div>
            <button 
              onClick={handleBookNew}
              className="px-4 py-2 bg-black dark:bg-white dark:text-black text-white rounded-xl font-bold text-xs transition-all active:scale-95"
            >
              Book Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <div 
                key={ride.id}
                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                    <Clock size={10} className="text-yellow-500" />
                    <span className="text-[10px] font-black uppercase text-yellow-600 dark:text-yellow-500 tracking-wider">
                      {new Date(ride.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-[9px] font-bold dark:text-gray-300">
                    Standard Ride
                  </span>
                </div>

                <div className="space-y-2 relative pl-4">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-2 h-2 rounded-full border border-green-500 bg-white dark:bg-zinc-900 z-10" />
                    <p className="text-xs font-medium dark:text-white truncate">{ride.pickupAddress?.street || 'Pickup Location'}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-2 h-2 rounded-full border border-red-500 bg-white dark:bg-zinc-900 z-10" />
                    <p className="text-xs font-medium dark:text-white truncate">{ride.dropoffAddress?.street || 'Drop-off Location'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-zinc-400" />
                    <p className="text-sm font-black dark:text-white">₦{(ride.scheduledFare ?? 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleCancel(ride.id)}
                    disabled={isDeleting === ride.id}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isDeleting === ride.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={handleBookNew}
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 dark:text-zinc-400 font-bold text-xs hover:border-yellow-500 hover:text-yellow-500 transition-all"
            >
              + Schedule New Ride
            </button>
          </div>
        )}
      </SidebarSection>
    </div>
  );
}
