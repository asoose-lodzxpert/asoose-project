"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { Loader2, X } from "lucide-react";
import { useRideStore } from "../store/ride";
import { RideService } from "@/services/ride.service";

export function FindingDriver() {
  const { data: session } = useSession();
  // --- Store Selectors ---
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const pickupAddress = useRideStore((state) => state.pickupAddress);
  const rideId = useRideStore((state) => state.rideId);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setRideId = useRideStore((state) => state.setRideId);

  // --- Local UI state for cancel button ---
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelRide = async () => {
    if (!rideId || !session?.accessToken) {
      setRideStatus("idle");
      return;
    }

    setIsCancelling(true);

    let cancelled = false;
    try {
      await RideService.cancelRide(
        rideId,
        "User cancelled search",
        session.accessToken,
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
      toast.info("Request cancelled");
      setRideStatus("idle");
      setRideId(null);
    }
  };

  return (
    <div className="absolute bottom-20 md:bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-yellow-400/20 rounded-full relative">
          <Loader2
            className="animate-spin text-yellow-600 dark:text-yellow-400"
            size={24}
          />
          {/* Pulsing effect behind loader */}
          <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping opacity-75"></div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
            Connecting you...
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Finding the best driver nearby
          </p>
        </div>
      </div>

      {/* Location Summary */}
      {(pickupAddress || pickupLocation) && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg mb-6 border border-zinc-100 dark:border-zinc-700">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
            Pickup Location
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-black dark:bg-white"></div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate">
              {pickupAddress
                ? pickupAddress
                : pickupLocation
                  ? `${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}`
                  : ""}
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-yellow-400 w-1/3 animate-indeterminate-bar rounded-full"></div>
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancelRide}
        disabled={isCancelling}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCancelling ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <X size={18} />
            <span>Cancel Request</span>
          </>
        )}
      </button>
    </div>
  );
}
