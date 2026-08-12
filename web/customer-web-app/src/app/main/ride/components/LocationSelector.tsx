"use client";

import { useRideStore } from "../store/ride";
import { MapPin, ArrowLeft, GripHorizontal } from "lucide-react";

export function LocationSelector() {
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const setIsConfiguring = useRideStore((state) => state.setIsConfiguring);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const pickupAddress = useRideStore((state) => state.pickupAddress);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress);

  // Note: We REMOVED setRideStatus.
  // We want to return to 'idle' (RideSelection) to show prices/cars.

  const handleConfirm = () => {
    // Stop configuring. This hides LocationSelector and shows RideSelection
    setIsConfiguring(null);
  };

  const selectedLocation =
    isConfiguring === "pickup" ? pickupLocation : dropoffLocation;
  const activeLabel = isConfiguring === "pickup" ? "pickup" : "drop-off";

  return (
    <div className="flex h-full min-h-0 flex-col animate-in slide-in-from-bottom-5 md:slide-in-from-left-5">
      <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 md:hidden" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3 sm:px-6 md:pt-6">
        <button
          onClick={() => setIsConfiguring(null)}
          className="mb-3 flex items-center gap-2 text-xs font-bold text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white sm:text-sm md:mb-4"
        >
          <ArrowLeft size={16} /> Back to options
        </button>

        <h1 className="mb-1 text-xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-2xl md:mb-2">
          Pin Location
        </h1>
        <p className="mb-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Tap the visible map above to place a pin, or drag an existing pin to
          adjust it precisely.
        </p>
        {isConfiguring && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20 md:mb-4">
            <GripHorizontal size={14} className="text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Setting <strong>{isConfiguring}</strong> — tap the map or drag the
              pin.
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-2.5 md:space-y-4">
          {/* Pickup Selection Button */}
          <button
            className={`w-full rounded-xl border-2 p-3 text-left transition-all group sm:p-4 ${
              isConfiguring === "pickup"
                ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-800"
                : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
            onClick={() => setIsConfiguring("pickup")}
          >
            <div className="flex items-center gap-3 mb-1">
              <MapPin
                size={18}
                className={
                  isConfiguring === "pickup"
                    ? "text-black dark:text-white"
                    : "text-zinc-400"
                }
              />
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">
                Pickup Location
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 pl-8 truncate">
              {pickupAddress ||
                (pickupLocation
                  ? `${pickupLocation.lat.toFixed(5)}, ${pickupLocation.lng.toFixed(5)}`
                  : "Tap map to set")}
            </p>
          </button>

          {/* Dropoff Selection Button */}
          <button
            className={`w-full rounded-xl border-2 p-3 text-left transition-all group sm:p-4 ${
              isConfiguring === "dropoff"
                ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-800"
                : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
            onClick={() => setIsConfiguring("dropoff")}
          >
            <div className="flex items-center gap-3 mb-1">
              <MapPin
                size={18}
                className={
                  isConfiguring === "dropoff"
                    ? "text-black dark:text-white"
                    : "text-zinc-400"
                }
              />
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">
                Dropoff Location
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 pl-8 truncate">
              {dropoffAddress ||
                (dropoffLocation
                  ? `${dropoffLocation.lat.toFixed(5)}, ${dropoffLocation.lng.toFixed(5)}`
                  : "Tap map to set")}
            </p>
          </button>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <button
          className="w-full rounded-xl bg-black py-3.5 text-sm font-black text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black sm:py-4 sm:text-base"
          disabled={!selectedLocation}
          onClick={handleConfirm}
        >
          {selectedLocation
            ? `Use ${activeLabel} location`
            : `Tap the map to set ${activeLabel}`}
        </button>
      </div>
    </div>
  );
}
