"use client";

import { useRideStore } from "../store/ride";
import { Navigation, MapPin, Share2, ShieldAlert } from "lucide-react";

export function TripInProgress() {
  const rideType = useRideStore((state) => state.rideType);
  const rideId = useRideStore((state) => state.rideId);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress);

  // Backend-computed ETA (populated by RideSocketListener's 5s poll)
  const driverEta = useRideStore((state) => state.driverEta);

  return (
    <div className="absolute bottom-20 md:bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-5">
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
            {rideType === "business" ? "Business Class" : "Economy Ride"}
          </p>
        </div>
      </div>

      {/* Destination Info */}
      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-100 dark:border-zinc-700">
        <div className="flex items-start gap-3">
          <MapPin className="text-red-500 mt-1 shrink-0" size={18} />
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              Dropoff
            </p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug line-clamp-2">
              {dropoffAddress || "Selected Destination"}
            </p>
          </div>
        </div>

        {/* Live Stats */}
        {driverEta && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
            <div className="text-center flex-1 border-r border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-400">Estimated Arrival</p>
              <p className="font-bold text-zinc-900 dark:text-white">
                {driverEta.minutes} min
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-zinc-400">Distance Remaining</p>
              <p className="font-bold text-zinc-900 dark:text-white">
                {driverEta.km.toFixed(1)} km
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Safety Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            const text = `I'm in a ride and need help. Ride ID: ${rideId ?? "unknown"}`;
            if (navigator.share) {
              navigator
                .share({
                  title: "Share My Trip",
                  text,
                  url: window.location.href,
                })
                .catch(() => {}); // User dismissed share sheet — not an error
            } else {
              navigator.clipboard?.writeText(
                `${text}\n${window.location.href}`,
              );
            }
          }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-bold text-sm text-zinc-700 dark:text-zinc-200"
        >
          <Share2 size={18} /> Share Trip
        </button>
        <button
          onClick={() => {
            // Primary: try the web Share API so the user can pick their emergency contact
            const emergencyText = `🚨 SOS – I need help! I'm in a ride.\nRide ID: ${rideId ?? "unknown"}\nTracking: ${window.location.href}`;
            if (navigator.share) {
              navigator
                .share({
                  title: "🚨 SOS — Need Help",
                  text: emergencyText,
                })
                .catch(() => {
                  // Fallback: open emergency call
                  window.location.href = "tel:112";
                });
            } else {
              // Direct fallback: open emergency call
              window.location.href = "tel:112";
            }
          }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-bold text-sm text-red-600 dark:text-red-400"
        >
          <ShieldAlert size={18} /> SOS
        </button>
      </div>
    </div>
  );
}
