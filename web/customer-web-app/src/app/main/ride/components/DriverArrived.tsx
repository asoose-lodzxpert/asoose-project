'use client';

import { useEffect, useState } from "react";
import { useRideStore } from "../store/ride";
import { Phone, MessageSquare, MapPin, Navigation } from "lucide-react";

export function DriverArrived() {
  const driver = useRideStore(s => s.driver);
  const rideStatus = useRideStore(s => s.rideStatus);
  const driverLocation = useRideStore(s => s.driverLocation);
  const pickupLocation = useRideStore(s => s.pickupLocation);
  
  // ETA calculation — local state (not in Zustand)
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  // --- Calculate Distance & ETA ---
  useEffect(() => {
    if (!driverLocation || !pickupLocation || typeof google === 'undefined') return;

    // 1. Calculate Distance (in meters)
    const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(
      driverLocation,
      pickupLocation
    );

    // 2. Convert to KM
    const km = distanceMeters / 1000;
    setDistanceKm(km);

    // 3. Estimate Time (Assume average city speed of 30km/h for MVP)
    // Speed = 30km/h = 0.5km/min
    // Time = Distance / Speed
    const minutes = Math.ceil(km / 0.5); 
    setEtaMinutes(minutes);

  }, [driverLocation, pickupLocation]);


  // --- Dynamic UI Variables ---
  const isArrived = rideStatus === 'arrived';
  
  const statusTitle = isArrived ? "Driver Arrived!" : "Driver is on the way";
  const statusMessage = isArrived 
    ? "Your ride is waiting at the pickup point." 
    : etaMinutes 
      ? `Arriving in approx ${etaMinutes} mins (${distanceKm?.toFixed(1)} km)`
      : "Heading to your pickup location...";

  const statusColor = isArrived ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600";
  const StatusIcon = isArrived ? MapPin : Navigation;

  return (
    <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-5">
      
      {/* Header Status */}
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${statusColor} ${!isArrived && 'animate-pulse'}`}>
          <StatusIcon size={24} />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">{statusTitle}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          {statusMessage}
        </p>
      </div>

      {/* Driver Card */}
      {driver && (
        <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl mb-6 flex items-center gap-4 border border-zinc-100 dark:border-zinc-700">
          <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-zinc-600 shadow-sm">
             <img src={driver.photoUrl} alt={driver.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <p className="font-bold text-zinc-900 dark:text-white truncate">{driver.name}</p>
                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-700 dark:text-yellow-400">
                    <span>★</span>
                    <span>{driver.rating.toFixed(1)}</span>
                </div>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {driver.vehicle.model} • <span className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs text-zinc-700 dark:text-zinc-300">{driver.vehicle.licensePlate}</span>
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <a 
          href={driver?.phone ? `tel:${driver.phone}` : '#'}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
             driver?.phone 
             ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200' 
             : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          }`}
        >
          <Phone size={18} /> Call Driver
        </a>
        
        <button 
          disabled
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed font-bold text-sm"
          title="Chat coming soon"
        >
          <MessageSquare size={18} /> Message
        </button>
      </div>
      
      {/* Footer Hint */}
      {!isArrived && (
        <p className="text-xs text-center text-zinc-400 mt-4 animate-pulse">
          Tracking driver location...
        </p>
      )}
    </div>
  );
}