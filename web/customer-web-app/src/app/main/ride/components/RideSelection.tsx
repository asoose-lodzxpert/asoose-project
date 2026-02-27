"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import { RideService, PriceEstimate } from "@/services/ride.service";
import { buildCreateRidePayload } from "@/services/build-create-ride-payload";
import { validateCreateRidePayload } from "@/services/validate-create-ride-payload";
import { normalizeApiError } from "@/services/normalize-api-error";
import { validateFareEstimatePayload } from "@/services/validate-fare-estimate-payload";
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";
import { useDebounce } from "../hooks/useDebounce";
import { SidebarSection, SidebarDivider } from "./Sidebar";
import { PrimaryButton, SecondaryButton, Text } from "@/components/ui";
import { X, RotateCcw, Loader2, Car } from "lucide-react";

/**
 * Retry a transient-failure-prone async operation (H2 fix).
 *
 * Retries up to `attempts` times with `delayMs` spacing.
 * Client errors (4xx) are not retried — except 408 (Request Timeout)
 * and 429 (Too Many Requests), which are network/capacity issues.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status: number | undefined = err?.status ?? err?.response?.status;
      // Don't retry definitive 4xx failures (validation, auth, not-found …)
      // but DO retry on 408 (timeout) and 429 (rate-limit).
      if (
        status &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 429
      ) {
        throw err;
      }
      if (i < attempts - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}

export function RideSelection() {
  const { data: session } = useSession();

  // --- Store Selectors ---
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setRideType = useRideStore((state) => state.setRideType);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);
  const setRideId = useRideStore((state) => state.setRideId);
  const clearPickupLocation = useRideStore(
    (state) => state.clearPickupLocation,
  );
  const clearDropoffLocation = useRideStore(
    (state) => state.clearDropoffLocation,
  );
  const clearAllLocations = useRideStore((state) => state.clearAllLocations);
  const setStartOtp = useRideStore((state) => state.setStartOtp);
  const setLockedEstimate = useRideStore((state) => state.setLockedEstimate);
  const setPaymentConfirmed = useRideStore(
    (state) => state.setPaymentConfirmed,
  );

  // --- Global Address Setters ---
  const setPickupAddressStore = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddressStore = useRideStore(
    (state) => state.setDropoffAddress,
  );

  // New Selectors for Map Control
  const mapInstance = useRideStore((state) => state.mapInstance);
  const isGoogleMapsLoaded = useRideStore((state) => state.isGoogleMapsLoaded);
  const setRoutePolyline = useRideStore((state) => state.setRoutePolyline);

  // --- Address State from Zustand ---
  const pickupAddress = useRideStore((state) => state.pickupAddress || "");
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress || "");
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<Record<
    string,
    PriceEstimate
  > | null>(null);
  // Fare confirmation: set when user selects a ride type, cleared on cancel or location change
  const [pendingBooking, setPendingBooking] = useState<{
    rideType: "economy" | "business";
    estimate: PriceEstimate;
  } | null>(null);

  // --- AbortControllers for Request Cancellation ---
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  const estimateAbortControllerRef = useRef<AbortController | null>(null);

  const debouncedPickup = useDebounce(pickupLocation, 500);
  const debouncedDropoff = useDebounce(dropoffLocation, 500);

  // Clear pending confirmation whenever locations change (stale fare protection)
  useEffect(() => {
    setPendingBooking(null);
  }, [debouncedPickup, debouncedDropoff]);

  // --- 1. Effect: Calculate Route Visuals (The Blue Line) ---
  useEffect(() => {
    if (
      !isGoogleMapsLoaded ||
      !mapInstance ||
      !debouncedPickup ||
      !debouncedDropoff
    )
      return;

    const calculateRoute = async () => {
      const directionsService = new google.maps.DirectionsService();

      try {
        const result = await directionsService.route({
          origin: debouncedPickup,
          destination: debouncedDropoff,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (result.routes[0]?.overview_polyline) {
          setRoutePolyline(result.routes[0].overview_polyline);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(debouncedPickup);
          bounds.extend(debouncedDropoff);
          mapInstance.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 250,
            left: 50,
          });
        }
      } catch (error) {
        console.error("Directions request failed", error);
      }
    };

    calculateRoute();
  }, [
    debouncedPickup,
    debouncedDropoff,
    isGoogleMapsLoaded,
    mapInstance,
    setRoutePolyline,
  ]);

  // --- 2. Effect: Fetch Backend Prices ---
  useEffect(() => {
    async function fetchEstimates() {
      if (!debouncedPickup || !debouncedDropoff || !session?.accessToken)
        return;

      estimateAbortControllerRef.current?.abort();

      const controller = new AbortController();
      estimateAbortControllerRef.current = controller;

      setIsCalculating(true);
      setEstimateError(null);
      try {
        const estimatePayload = {
          pickupLat: debouncedPickup.lat,
          pickupLng: debouncedPickup.lng,
          dropoffLat: debouncedDropoff.lat,
          dropoffLng: debouncedDropoff.lng,
        };

        try {
          validateFareEstimatePayload(estimatePayload);
        } catch (validationError) {
          const msg =
            validationError instanceof Error
              ? validationError.message
              : "Invalid fare estimate payload";
          setEstimateError(msg);
          setIsCalculating(false);
          return;
        }

        const data = await RideService.getEstimate(
          estimatePayload,
          session.accessToken,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setEstimates(data);
          setEstimateError(null);
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to get estimates:", error);
        if (!controller.signal.aborted) {
          const msg =
            error?.type === "network-error"
              ? "Cannot reach server. Is the backend running? Tap to retry."
              : error?.type === "timeout"
                ? "Request timed out. Tap to retry."
                : error?.message || "Failed to load ride prices. Tap to retry.";
          setEstimateError(msg);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculating(false);
        }
      }
    }

    fetchEstimates();

    return () => {
      estimateAbortControllerRef.current?.abort();
    };
  }, [debouncedPickup, debouncedDropoff, session?.accessToken]);

  // --- Booking Handler (called only after the user confirms on the confirmation panel) ---
  const handleRideRequest = async (
    rideType: "economy" | "business",
    lockedEstimate: PriceEstimate,
  ) => {
    if (!pickupLocation || !dropoffLocation) {
      toast.error("Please select both pickup and dropoff locations");
      return;
    }
    if (!session?.accessToken) {
      toast.error("You must be logged in to book a ride");
      return;
    }

    setIsSubmitting(true);
    setRideType(rideType);
    // Store the locked fare so the post-match payment screen can display it
    setLockedEstimate({
      fare: lockedEstimate.estimatedFare,
      distance: lockedEstimate.distance,
      duration: lockedEstimate.duration,
    });
    // Reset any previous payment confirmation flag for this new booking
    setPaymentConfirmed(false);

    try {
      const vehicleKey = rideType.toUpperCase();
      // Use the locked estimate from the confirmation screen — prevents stale fare surprises
      const selectedEstimate = lockedEstimate;

      const payload = buildCreateRidePayload({
        pickupLocation: {
          addressText: pickupAddress || "Pinned Location",
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
        },
        dropoffLocation: {
          addressText: dropoffAddress || "Pinned Location",
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
        },
        vehicleType: vehicleKey,
        fare: selectedEstimate.estimatedFare,
        distanceKm: selectedEstimate.distance,
        durationMin: selectedEstimate.duration,
      });

      try {
        validateCreateRidePayload(payload);
      } catch (validationError) {
        toast.error(
          validationError instanceof Error
            ? validationError.message
            : "Invalid booking payload",
        );
        setIsSubmitting(false);
        setRideStatus("idle");
        return;
      }

      const idempotencyKey = crypto.randomUUID();
      const accessToken = session.accessToken as string; // already guarded above
      // Retry up to 3× on network/server errors; 4xx (except 408/429) rethrown immediately (H2 fix)
      const response = await withRetry(
        () => RideService.createRide(payload, accessToken, idempotencyKey),
        3,
        1000,
      );
      if (setRideId) setRideId(response.ride.id);
      // Store OTP so it can be shown to the driver when they arrive
      if ((response.ride as any).startOtp)
        setStartOtp((response.ride as any).startOtp);

      // Driver matching begins on the backend after createRide.
      // confirmRide is called later from PostDriverPayment after DRIVER_FOUND.
      setRideStatus("searching");
    } catch (error: any) {
      const norm = normalizeApiError(error);
      console.error("Booking failed:", JSON.stringify(norm, null, 2));

      // Surface specific, user-friendly messages based on error type
      const userMessage =
        error?.type === "network-error"
          ? "Cannot reach the server. Please check your connection and try again."
          : error?.type === "timeout"
            ? "The request timed out. Please try again."
            : norm.message || "Failed to request ride. Please try again.";

      toast.error(userMessage);
      setRideStatus("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Show the confirmation panel for the selected ride type ---
  const handleSelectRide = (rideType: "economy" | "business") => {
    const vehicleKey = rideType.toUpperCase();
    const estimate = estimates?.[vehicleKey];
    if (!estimate) {
      toast.error("Fare estimate not available. Please wait for calculation.");
      return;
    }
    setPendingBooking({ rideType, estimate });
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);

  const formatDuration = (minutes: number) => Math.ceil(minutes) + " min";

  // --- 3. Clear Location Handlers ---
  const handleClearPickup = () => {
    routeAbortControllerRef.current?.abort();
    routeAbortControllerRef.current = null; // L6: release resolved controller reference
    estimateAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current = null; // L6
    clearPickupLocation();
    setPickupAddress("");
    setEstimates(null);
    toast.info("Pickup location cleared");
  };

  const handleClearDropoff = () => {
    routeAbortControllerRef.current?.abort();
    routeAbortControllerRef.current = null; // L6: release resolved controller reference
    estimateAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current = null; // L6
    clearDropoffLocation();
    setDropoffAddress("");
    setEstimates(null);
    toast.info("Dropoff location cleared");
  };

  return (
    <>
      {/* Pickup Location */}
      <SidebarSection title="From">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LocationAutocompleteInput
              type="pickup"
              onLocationSelect={(loc, address) => {
                setPickupLocation(loc);
                setPickupAddress(address);
                setPickupAddressStore(address);
              }}
              initialValue={
                pickupLocation ? pickupAddress || "Current Pickup" : ""
              }
            />
          </div>
          {pickupLocation && (
            <button
              onClick={handleClearPickup}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
              title="Clear pickup location"
              aria-label="Clear pickup location"
            >
              <X size={18} className="text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </SidebarSection>

      <SidebarDivider />

      {/* Dropoff Location */}
      <SidebarSection title="To">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LocationAutocompleteInput
              type="dropoff"
              onLocationSelect={(loc, address) => {
                setDropoffLocation(loc);
                setDropoffAddress(address);
                setDropoffAddressStore(address);
              }}
              initialValue={
                dropoffLocation ? dropoffAddress || "Current Dropoff" : ""
              }
            />
          </div>
          {dropoffLocation && (
            <button
              onClick={handleClearDropoff}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
              title="Clear dropoff location"
              aria-label="Clear dropoff location"
            >
              <X size={18} className="text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </SidebarSection>

      {/* Fare Estimates & Ride Selection - Show once both locations are set */}
      {pickupLocation && dropoffLocation && (
        <>
          <SidebarDivider />

          {/* Loading state */}
          {isCalculating && !estimates && (
            <SidebarSection title="Select Ride">
              <div className="flex items-center justify-center h-20 text-zinc-500 dark:text-zinc-400">
                <RotateCcw size={18} className="animate-spin mr-2" />
                <Text size="sm" variant="secondary">
                  Calculating fares...
                </Text>
              </div>
            </SidebarSection>
          )}

          {/* Error state with retry */}
          {estimateError && !isCalculating && (
            <SidebarSection title="Select Ride">
              <button
                onClick={() => {
                  setEstimateError(null);
                  setEstimates(null);
                  // Trigger re-fetch by clearing and resetting the estimate abort controller
                  estimateAbortControllerRef.current?.abort();
                  const controller = new AbortController();
                  estimateAbortControllerRef.current = controller;
                  if (
                    debouncedPickup &&
                    debouncedDropoff &&
                    session?.accessToken
                  ) {
                    setIsCalculating(true);
                    RideService.getEstimate(
                      {
                        pickupLat: debouncedPickup.lat,
                        pickupLng: debouncedPickup.lng,
                        dropoffLat: debouncedDropoff.lat,
                        dropoffLng: debouncedDropoff.lng,
                      },
                      session.accessToken,
                      controller.signal,
                    )
                      .then((data) => {
                        if (!controller.signal.aborted) {
                          setEstimates(data);
                          setEstimateError(null);
                        }
                      })
                      .catch((err) => {
                        if (
                          err.name !== "AbortError" &&
                          !controller.signal.aborted
                        ) {
                          const msg =
                            err?.type === "network-error"
                              ? "Cannot reach server. Is the backend running? Tap to retry."
                              : err?.type === "timeout"
                                ? "Request timed out. Tap to retry."
                                : err?.message ||
                                  "Failed to load ride prices. Tap to retry.";
                          setEstimateError(msg);
                        }
                      })
                      .finally(() => {
                        if (!controller.signal.aborted) setIsCalculating(false);
                      });
                  }
                }}
                className="flex items-center justify-center h-20 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <Text size="sm" className="text-red-600 dark:text-red-400">
                  {estimateError}
                </Text>
              </button>
            </SidebarSection>
          )}

          {/* Estimates loaded — show confirmation panel OR payment method + ride selection */}
          {estimates && (
            <>
              {pendingBooking ? (
                /* ── Fare Confirmation Panel ──────────────────────────── */
                <SidebarSection title="Confirm Booking">
                  {/* Route summary */}
                  <div className="w-full space-y-2 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        From
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                        {pickupAddress || "Pickup location"}
                      </p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-white/10 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        To
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                        {dropoffAddress || "Dropoff location"}
                      </p>
                    </div>
                  </div>

                  {/* Fare details */}
                  <div className="w-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">
                        {pendingBooking.rideType}
                      </span>
                      <span className="text-xl font-black text-gray-900 dark:text-white">
                        {formatMoney(pendingBooking.estimate.estimatedFare)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pendingBooking.estimate.distance.toFixed(1)} km &middot;{" "}
                      {formatDuration(pendingBooking.estimate.duration)}{" "}
                      &middot; Pay after driver is assigned
                    </p>
                  </div>

                  <p className="text-xs text-amber-600 dark:text-amber-500 font-medium w-full">
                    ✓ Confirmed fare — you will not be charged more than this
                    amount.
                  </p>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <SecondaryButton
                      onClick={() => setPendingBooking(null)}
                      disabled={isSubmitting}
                      className="!text-yellow-700 dark:!text-yellow-500 hover:!bg-yellow-50 dark:hover:!bg-yellow-900/20 focus:ring-yellow-500"
                    >
                      ← Change
                    </SecondaryButton>
                    <PrimaryButton
                      onClick={() =>
                        handleRideRequest(
                          pendingBooking.rideType,
                          pendingBooking.estimate,
                        )
                      }
                      disabled={isSubmitting}
                      className="!bg-yellow-600 hover:!bg-yellow-700 !text-white focus:ring-yellow-500"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Booking...
                        </span>
                      ) : (
                        "Confirm & Book"
                      )}
                    </PrimaryButton>
                  </div>
                </SidebarSection>
              ) : (
                /* ── Ride Type Selection ─────────────────────────────── */
                <SidebarSection title="Select Ride">
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {/* Economy Button */}
                    <PrimaryButton
                      onClick={() => handleSelectRide("economy")}
                      disabled={isSubmitting || isCalculating}
                      className="h-22 flex flex-col items-center justify-center !bg-yellow-600 hover:!bg-yellow-700 !text-white focus:ring-yellow-500"
                    >
                      {isCalculating ? (
                        <Text size="xs" className="!text-white/80">
                          Calculating...
                        </Text>
                      ) : (
                        <>
                          <Car size={24} className="mb-1 text-white/90" />
                          <Text size="sm" weight="semibold" className="!text-white">
                            Economy
                          </Text>
                          {estimates?.["ECONOMY"] && (
                            <Text
                              size="xs"
                              className="mt-0.5 !text-white/80"
                            >
                              {formatDuration(estimates["ECONOMY"].duration)}{" "}
                              &bull;{" "}
                              {formatMoney(estimates["ECONOMY"].estimatedFare)}
                            </Text>
                          )}
                        </>
                      )}
                    </PrimaryButton>

                    {/* Business Button */}
                    <PrimaryButton
                      onClick={() => handleSelectRide("business")}
                      disabled={isSubmitting || isCalculating}
                      className="h-22 flex flex-col items-center justify-center !bg-green-600 hover:!bg-green-700 !text-white focus:ring-green-500"
                    >
                      {isCalculating ? (
                        <Text size="xs" className="!text-white/80">
                          Calculating...
                        </Text>
                      ) : (
                        <>
                          <Car size={24} className="mb-1 text-white/90" />
                          <Text
                            size="sm"
                            weight="semibold"
                            className="!text-white"
                          >
                            Business
                          </Text>
                          {estimates?.["BUSINESS"] && (
                            <Text size="xs" className="mt-0.5 !text-white/80">
                              {formatDuration(estimates["BUSINESS"].duration)}{" "}
                              &bull;{" "}
                              {formatMoney(estimates["BUSINESS"].estimatedFare)}
                            </Text>
                          )}
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </SidebarSection>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}