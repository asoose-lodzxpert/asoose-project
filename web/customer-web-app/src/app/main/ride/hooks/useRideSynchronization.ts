"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRideStore, RideStage } from "../store/ride";
import { RideService, RideStatus } from "@/services/ride.service";
import { mapRideToViewModel } from "@/services/mappers/ride.mapper";
import { mapBackendStatusToRideStage } from "@/services/formatters/ride-status.formatter";
import { toast } from "react-toastify";

/** Polling interval in ms — acts as safety net when socket drops */
const POLL_INTERVAL_MS = 15_000;

/** Ride stages that indicate an active ride worth polling for */
const ACTIVE_STAGES: RideStage[] = [
  "searching",
  "confirmed",
  "arrived",
  "in-progress",
  "payment-required",
];

export function useRideSynchronization() {
  const { data: session } = useSession();
  const hasSynced = useRef(false); // Prevent double-fetch in React 18 strict mode

  // Store Setters
  const setRideId = useRideStore((state) => state.setRideId);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  const clearAllLocations = useRideStore((state) => state.clearAllLocations);
  const setDriver = useRideStore((state) => state.setDriver);
  const setTripSummary = useRideStore((state) => state.setTripSummary);
  const setRideType = useRideStore((state) => state.setRideType);
  const setStartOtp = useRideStore((state) => state.setStartOtp);
  const paymentConfirmed = useRideStore((state) => state.paymentConfirmed);

  /**
   * Core sync function — fetches current ride from backend and reconciles store.
   * Used for both initial sync and periodic polling.
   *
   * statusMap is built INSIDE the callback so it always reflects the current
   * value of paymentConfirmed — no stale-closure risk (C2 fix).
   */
  const syncRideState = useCallback(
    async (token: string) => {
      try {
        const backendRide = await RideService.getCurrentRide(token);

        // Guard: treat missing/malformed ride objects (no id or status) the same as
        // no active ride — avoids a RideMapper throw on the initial sync when the
        // backend returns a partial object instead of null.
        if (!backendRide || !backendRide.id || !backendRide.status) {
          // No active ride on the backend — always reset to idle so stale persisted
          // statuses (searching, confirmed, arrived, in-progress) don't leave the UI
          // stuck on an active-ride screen after the ride ends.
          // IMPORTANT: exclude 'finished' — the rating modal lives in that stage and
          // getCurrentRide() returns null for completed rides, which would destroy it.
          const currentStatus = useRideStore.getState().rideStatus;
          if (
            currentStatus !== "idle" &&
            currentStatus !== "configuring" &&
            currentStatus !== "finished" &&
            currentStatus !== "payment-required"
          ) {
            console.log(
              `🔄 No active ride on backend (local: ${currentStatus}). Resetting to idle.`,
            );
            // Clear all locations/addresses too — prevents stale "Pinned Location"
            // text appearing in the address fields after the ride ends.
            clearAllLocations();
          }
          return;
        }

        // Guard: if user already rated and reset to idle, but the backend still
        // shows the ride as PAID (it hasn't dropped off getCurrentRide yet),
        // don't re-show the ride. This prevents the rating modal from popping
        // up again after the user completed the flow.
        {
          const currentStatus = useRideStore.getState().rideStatus;
          if (
            currentStatus === "idle" &&
            backendRide.status === "PAID"
          ) {
            return;
          }
        }

        // Use centralized status mapper (State Management fix).
        // Post-ride payment model: payment.status determines whether ride
        // maps to 'payment-required' or 'finished' (no pre-ride payment gate).
        const serverPaymentCompleted =
          backendRide.payment?.status === "COMPLETED";

        const activeRide = mapRideToViewModel(backendRide);
        const mappedStatus = mapBackendStatusToRideStage(
          activeRide.status,
          false, // paymentConfirmed is unused in post-ride model
          serverPaymentCompleted
        );

        // Only update store if something actually changed
        const state = useRideStore.getState();
        if (state.rideId !== activeRide.id) {
          setRideId(activeRide.id);
        }

        // Always reconcile status — this is the key polling value.
        // Guard: the backend never persists ARRIVED to the database (it's a
        // socket-only event), so polls always return DRIVER_ACCEPTED even
        // after the driver has arrived. Without this guard the local state
        // would regress from 'arrived' back to 'confirmed' on every poll.
        const STAGE_ORDER: string[] = [
          'idle', 'configuring', 'searching', 'confirmed',
          'arrived', 'in-progress', 'payment-required', 'finished',
        ];
        const currentIdx = STAGE_ORDER.indexOf(state.rideStatus);
        const mappedIdx = STAGE_ORDER.indexOf(mappedStatus);

        if (state.rideStatus !== mappedStatus && mappedIdx >= currentIdx) {
          console.log(`🔄 Status sync: ${state.rideStatus} → ${mappedStatus}`);
          setRideStatus(mappedStatus);
        }

        // Restore locations.
        // Guard: don't overwrite a real address label with the generic backend
        // fallback "Pinned Location" — that string appears when the backend stored
        // no street/city/state (e.g. tap-to-pin with no reverse-geocode at ride
        // creation time). Keeping the store value prevents the input fields from
        // reverting to "Pinned Location" after a page refresh.
        const PLACEHOLDER = "Pinned Location";
        if (
          activeRide.pickupAddress.addressText &&
          activeRide.pickupAddress.addressText !== PLACEHOLDER
        ) {
          setPickupAddress(activeRide.pickupAddress.addressText);
        } else if (
          activeRide.pickupAddress.lat !== null &&
          activeRide.pickupAddress.lng !== null
        ) {
          // Backend stored no street/city/state — fall back to coordinates so the
          // address field is never blank or "Pinned Location".
          setPickupAddress(
            `${activeRide.pickupAddress.lat!.toFixed(5)}, ${activeRide.pickupAddress.lng!.toFixed(5)}`,
          );
        }
        if (
          activeRide.pickupAddress.lat !== null &&
          activeRide.pickupAddress.lng !== null
        ) {
          setPickupLocation({
            lat: activeRide.pickupAddress.lat,
            lng: activeRide.pickupAddress.lng,
          });
        }
        if (
          activeRide.dropoffAddress.addressText &&
          activeRide.dropoffAddress.addressText !== PLACEHOLDER
        ) {
          setDropoffAddress(activeRide.dropoffAddress.addressText);
        } else if (
          activeRide.dropoffAddress.lat !== null &&
          activeRide.dropoffAddress.lng !== null
        ) {
          // Backend stored no street/city/state — fall back to coordinates.
          setDropoffAddress(
            `${activeRide.dropoffAddress.lat!.toFixed(5)}, ${activeRide.dropoffAddress.lng!.toFixed(5)}`,
          );
        }
        if (
          activeRide.dropoffAddress.lat !== null &&
          activeRide.dropoffAddress.lng !== null
        ) {
          setDropoffLocation({
            lat: activeRide.dropoffAddress.lat,
            lng: activeRide.dropoffAddress.lng,
          });
        }

        // Restore OTP (for ACCEPTED/ARRIVED — customer needs to show driver)
        if (
          (mappedStatus === "confirmed" || mappedStatus === "arrived") &&
          backendRide.startOtp
        ) {
          setStartOtp(backendRide.startOtp);
        } else if (
          mappedStatus === "in-progress" ||
          mappedStatus === "finished"
        ) {
          setStartOtp(null); // Clear once trip has started
        }

        // Restore vehicle/ride type from backend (ECONOMY | BUSINESS)
        // This ensures TripInProgress / DriverArrived labels survive page refresh.
        if (backendRide.vehicleType) {
          const normalised = backendRide.vehicleType.toLowerCase() as
            | "economy"
            | "business";
          if (normalised === "economy" || normalised === "business") {
            const state = useRideStore.getState();
            if (state.rideType !== normalised) {
              setRideType(normalised);
            }
          }
        }

        // Restore driver if assigned
        if (activeRide.driver) {
          setDriver({
            name: activeRide.driver.name,
            photoUrl: activeRide.driver.image || "/profile.jpg",
            vehicle: {
              make: activeRide.driver.vehicleBrand || "Vehicle",
              model: activeRide.driver.vehicleModel || "Car",
              licensePlate: activeRide.driver.vehicleNumber || "---",
            },
            rating: activeRide.driver.rating ?? null,
            phone: activeRide.driver.phone || "",
          });
        }

        // Restore financials if finished or payment-required
        if (mappedStatus === "finished" || mappedStatus === "payment-required") {
          setTripSummary({
            fare: activeRide.actualFare,
            distance: activeRide.distanceKm || 0,
            duration: activeRide.durationMin || 0,
          });
        }
      } catch (error: any) {
        const status = error?.status ?? error?.response?.status;
        const message =
          error?.message ?? error?.response?.data?.message ?? String(error);
        if (status === 404 || message?.includes("not found")) {
          return; // Expected when no active ride
        }
        console.warn("Failed to sync ride state:", message);
      }
    },
    [
      paymentConfirmed, // must be here — statusMap reads it inside the callback
      setRideId,
      setRideStatus,
      setPickupLocation,
      setDropoffLocation,
      setPickupAddress,
      setDropoffAddress,
      clearAllLocations,
      setDriver,
      setTripSummary,
      setRideType, // called inside the callback but was previously missing
      setStartOtp,
    ],
  );

  // --- Initial one-shot sync on mount ---
  useEffect(() => {
    if (!session?.accessToken || hasSynced.current) return;
    hasSynced.current = true;
    console.log("🔄 Initial ride state sync...");
    syncRideState(session.accessToken);
  }, [session, syncRideState]);

  // Stable selector — used in the polling effect dependency array
  const rideStatus = useRideStore((state) => state.rideStatus);

  // --- Periodic polling as socket backup ---
  useEffect(() => {
    if (!session?.accessToken) return;

    // Only poll during active ride stages
    if (!ACTIVE_STAGES.includes(rideStatus)) return;

    const interval = setInterval(() => {
      const currentStatus = useRideStore.getState().rideStatus;
      if (!ACTIVE_STAGES.includes(currentStatus)) {
        clearInterval(interval);
        return;
      }
      syncRideState(session.accessToken!);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [session, syncRideState, rideStatus]);

  // --- Re-sync when tab regains focus (user switches back) ---
  useEffect(() => {
    if (!session?.accessToken) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Sync on tab focus regardless of stage — catches rides that ended while tab was hidden.
        console.log("👁️ Tab visible — re-syncing ride state...");
        syncRideState(session.accessToken!);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, syncRideState]);
}
