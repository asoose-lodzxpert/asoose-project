'use client';

import { useEffect, useState } from 'react';
import { useRideStore } from '../store/ride';
import { Navigation, MapPin, Share2, ShieldAlert } from 'lucide-react';

export function TripInProgress() {
  const rideType = useRideStore((state) => state.rideType);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const driverLocation = useRideStore((state) => state.driverLocation);
  
  // Local state for ETA
  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);

  // --- Calculate Live ETA to Dropoff ---
  useEffect(() => {
    if (!driverLocation || !dropoffLocation) return;

    try {
      let distanceMeters = 0;

      // Try using Google Maps geometry library if available
      if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
        distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(
          driverLocation,
          dropoffLocation
        );
      } else {
        // Fallback: Use Haversine formula if Google Maps geometry library isn't loaded
        distanceMeters = calculateDistanceHaversine(driverLocation, dropoffLocation);
      }

      const km = distanceMeters / 1000;
      
      // Estimate time (Assuming 30km/h average speed in city)
      // Speed: 0.5 km/min
      const minutes = Math.ceil(km / 0.5);

      setEta({ minutes, km });
    } catch (error) {
      console.error('Error calculating ETA:', error);
      // Don't show ETA if calculation fails
    }
  }, [driverLocation, dropoffLocation]);

  /**
   * Fallback: Calculate distance using Haversine formula
   * Returns distance in meters
   */
  function calculateDistanceHaversine(
    loc1: google.maps.LatLng | google.maps.LatLngLiteral,
    loc2: google.maps.LatLng | google.maps.LatLngLiteral
  ): number {
    const lat1 = typeof loc1.lat === 'function' ? loc1.lat() : loc1.lat;
    const lng1 = typeof loc1.lng === 'function' ? loc1.lng() : loc1.lng;
    const lat2 = typeof loc2.lat === 'function' ? loc2.lat() : loc2.lat;
    const lng2 = typeof loc2.lng === 'function' ? loc2.lng() : loc2.lng;

    const R = 6371000; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  return (
    <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-5">
      
      {/* Header with Pulse */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full relative">
          <Navigation size={24} className="relative z-10" />
          <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
        </div>
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
            Heading to Destination
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {rideType === 'business' ? 'Business Class' : 'Economy Ride'}
          </p>
        </div>
      </div>

      {/* Destination Info */}
      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-100 dark:border-zinc-700">
        <div className="flex items-start gap-3">
          <MapPin className="text-red-500 mt-1 shrink-0" size={18} />
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Dropoff</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug line-clamp-2">
              {dropoffAddress || "Selected Destination"}
            </p>
          </div>
        </div>
        
        {/* Live Stats */}
        {eta && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                <div className="text-center flex-1 border-r border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs text-zinc-400">Estimated Arrival</p>
                    <p className="font-bold text-zinc-900 dark:text-white">{eta.minutes} min</p>
                </div>
                <div className="text-center flex-1">
                    <p className="text-xs text-zinc-400">Distance Remaining</p>
                    <p className="font-bold text-zinc-900 dark:text-white">{eta.km.toFixed(1)} km</p>
                </div>
            </div>
        )}
      </div>

      {/* Safety Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-bold text-sm text-zinc-700 dark:text-zinc-200">
          <Share2 size={18} /> Share Trip
        </button>
        <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-bold text-sm text-red-600 dark:text-red-400">
          <ShieldAlert size={18} /> SOS
        </button>
      </div>
    </div>
  );
}