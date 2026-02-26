"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import { RideService } from "@/services/ride.service";
import {
  Phone,
  MessageSquare,
  MapPin,
  Navigation,
  KeyRound,
  X,
  Loader2,
} from "lucide-react";

export function DriverArrived() {
  const { data: session } = useSession();
  const driver = useRideStore((s) => s.driver);
  const rideStatus = useRideStore((s) => s.rideStatus);
  const rideId = useRideStore((s) => s.rideId);
  const driverLocation = useRideStore((s) => s.driverLocation);
  const pickupLocation = useRideStore((s) => s.pickupLocation);
  const startOtp = useRideStore((s) => s.startOtp);
  const setRideStatus = useRideStore((s) => s.setRideStatus);
  const setRideId = useRideStore((s) => s.setRideId);

  // ETA calculation — local state (not in Zustand)
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // --- Calculate Distance & ETA ---
  useEffect(() => {
    if (!driverLocation || !pickupLocation) return;

    // Haversine + fixed 30 km/h used as a fallback when Distance Matrix
    // is unavailable or returns an error (L3 fix).
    const haversineEta = () => {
      if (typeof google === "undefined" || !google.maps?.geometry?.spherical)
        return;
      const distanceMeters =
        google.maps.geometry.spherical.computeDistanceBetween(
          driverLocation,
          pickupLocation,
        );
      const km = distanceMeters / 1000;
      setDistanceKm(km);
      setEtaMinutes(Math.ceil(km / 0.5));
    };

    // Prefer Distance Matrix (traffic-aware) when available (L3 fix).
    if (typeof google === "undefined" || !google.maps?.DistanceMatrixService) {
      haversineEta();
      return;
    }

    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [{ lat: driverLocation.lat, lng: driverLocation.lng }],
        destinations: [{ lat: pickupLocation.lat, lng: pickupLocation.lng }],
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          const element = result?.rows[0]?.elements[0];
          if (element?.status === "OK") {
            setDistanceKm(element.distance.value / 1000);
            setEtaMinutes(Math.ceil(element.duration.value / 60));
            return;
          }
        }
        // API quota exceeded or network error — degrade gracefully
        haversineEta();
      },
    );
  }, [driverLocation, pickupLocation]);

  // --- Cancel Ride Handler ---
  const handleCancelRide = async () => {
    if (!rideId || isCancelling) return;
    setIsCancelling(true);
    let cancelled = false;
    try {
      await RideService.cancelRide(
        rideId,
        "Customer cancelled",
        session?.accessToken,
      );
      cancelled = true;
    } catch (error: any) {
      // 404 = ride not found, 409 = already cancelled — ride is gone either way (M6 fix).
      const httpStatus = error?.status ?? error?.response?.status;
      if (httpStatus === 404 || httpStatus === 409) {
        cancelled = true;
      } else {
        console.error("Cancellation failed:", error);
        toast.error("Failed to cancel. Please try again.");
      }
    } finally {
      setIsCancelling(false);
    }

    if (cancelled) {
      toast.info("Ride cancelled");
      setRideStatus("idle");
      setRideId(null);
    }
  };

  // --- Dynamic UI Variables ---
  const isArrived = rideStatus === "arrived";

  const statusTitle = isArrived ? "Driver Arrived!" : "Driver is on the way";
  const statusMessage = isArrived
    ? "Your ride is waiting at the pickup point."
    : etaMinutes
      ? `Arriving in approx ${etaMinutes} mins (${distanceKm?.toFixed(1)} km)`
      : "Heading to your pickup location...";

  const statusColor = isArrived
    ? "bg-green-100 text-green-600"
    : "bg-blue-100 text-blue-600";
  const StatusIcon = isArrived ? MapPin : Navigation;

  return (
    <div className="absolute bottom-20 md:bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 max-h-[70vh] overflow-y-auto p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-5">
      {/* Header Status */}
      <div className="text-center mb-6">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${statusColor} ${!isArrived && "animate-pulse"}`}
        >
          <StatusIcon size={24} />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          {statusTitle}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          {statusMessage}
        </p>
      </div>

      {/* Driver Card */}
      {driver && (
        <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl mb-6 flex items-center gap-4 border border-zinc-100 dark:border-zinc-700">
          <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-zinc-600 shadow-sm">
            <img
              src={driver.photoUrl}
              alt={driver.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="font-bold text-zinc-900 dark:text-white truncate">
                {driver.name}
              </p>
              <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-700 dark:text-yellow-400">
                <span>★</span>
                <span>{driver.rating.toFixed(1)}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {driver.vehicle.model} •{" "}
              <span className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs text-zinc-700 dark:text-zinc-300">
                {driver.vehicle.licensePlate}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* OTP — show to driver to verify and start the trip */}
      {startOtp && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <KeyRound
              size={15}
              className="text-amber-600 dark:text-amber-400"
            />
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Trip Code — Share with driver
            </p>
          </div>
          <p className="text-3xl font-black font-mono tracking-widest text-amber-800 dark:text-amber-200">
            {startOtp}
          </p>
          <p className="text-xs text-amber-500 mt-1">
            Driver enters this to start the trip
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {driver?.phone ? (
          <a
            href={`tel:${driver.phone}`}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Phone size={18} /> Call Driver
          </a>
        ) : (
          <button
            disabled
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 text-zinc-400 cursor-not-allowed font-bold text-sm"
            title="Driver contact not available"
          >
            <Phone size={18} /> Call Driver
          </button>
        )}

        <button
          disabled
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed font-bold text-sm"
          title="Chat coming soon"
        >
          <MessageSquare size={18} /> Message
        </button>
      </div>

      {/* Cancel Ride — available while driver hasn't yet started the trip */}
      {!isArrived && (
        <button
          onClick={handleCancelRide}
          disabled={isCancelling}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCancelling ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Cancelling...</span>
            </>
          ) : (
            <>
              <X size={16} />
              <span>Cancel Ride</span>
            </>
          )}
        </button>
      )}

      {/* Footer Hint */}
      {!isArrived && (
        <p className="text-xs text-center text-zinc-400 mt-4 animate-pulse">
          Tracking driver location...
        </p>
      )}
    </div>
  );
}
