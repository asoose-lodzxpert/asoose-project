"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRideStore, RideStage } from "../store/ride";
import { RideService, RideStatus } from "@/services/ride.service";
import { mapRideToViewModel } from "@/services/mappers/ride.mapper";
import { toast } from "react-toastify";

/** Polling interval in ms — acts as safety net when socket drops */
const POLL_INTERVAL_MS = 15_000;

/** Ride stages that indicate an active ride worth polling for */
const ACTIVE_STAGES: RideStage[] = [
  "searching",
  "awaiting-payment",
  "confirmed",
  "arrived",
  "in-progress",
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
  const setDriver = useRideStore((state) => state.setDriver);
  const setTripSummary = useRideStore((state) => state.setTripSummary);
  const setRideType = useRideStore((state) => state.setRideType);
  const setStartOtp = useRideStore((state) => state.setStartOtp);
  const paymentConfirmed = useRideStore((state) => state.paymentConfirmed);

  // Build statusMap with a dynamic ACCEPTED mapping:
  // - 'awaiting-payment' when the user hasn't selected their payment method yet
  // - 'confirmed'        once paymentConfirmed flag is set (user chose cash/card)
  const statusMap: Record<RideStatus, RideStage> = {
    // PENDING = ride created but payment not yet confirmed.
    // Map to "idle" so users can retry. Card-payment callback handles this
    // state separately via the /payment/callback route + localStorage keys.
    PENDING: "idle",
    REQUESTED: "searching",
    SEARCHING_DRIVER: "searching",
    DRIVER_ASSIGNED: "searching",
    DRIVER_ACCEPTED: paymentConfirmed ? "confirmed" : "awaiting-payment",
    ACCEPTED: paymentConfirmed ? "confirmed" : "awaiting-payment",
    PAID: "confirmed",
    ARRIVED: "arrived",
    IN_PROGRESS: "in-progress",
    COMPLETED: "finished",
    CANCELLED: "idle",
    CANCELLED_BY_USER: "idle",
    CANCELLED_BY_DRIVER: "idle",
    CANCELLED_BY_SYSTEM: "idle",
  };

  /**
   * Core sync function — fetches current ride from backend and reconciles store.
   * Used for both initial sync and periodic polling.
   */
  const syncRideState = useCallback(
    async (token: string) => {
      try {
        const backendRide = await RideService.getCurrentRide(token);

        if (!backendRide) {
          // No active ride on the backend — always reset to idle so stale persisted
          // statuses (searching, confirmed, arrived, in-progress) don't leave the UI
          // stuck on an active-ride screen after the ride ends.
          // IMPORTANT: exclude 'finished' — the rating modal lives in that stage and
          // getCurrentRide() returns null for completed rides, which would destroy it.
          const currentStatus = useRideStore.getState().rideStatus;
          if (currentStatus !== "idle" && currentStatus !== "configuring" && currentStatus !== "finished") {
            console.log(
              `🔄 No active ride on backend (local: ${currentStatus}). Resetting to idle.`,
            );
            setRideId(null);
            setRideStatus("idle");
          }
          return;
        }

        const activeRide = mapRideToViewModel(backendRide);
        const mappedStatus = statusMap[activeRide.status] || "idle";

        // Only update store if something actually changed
        const state = useRideStore.getState();
        if (state.rideId !== activeRide.id) {
          setRideId(activeRide.id);
        }

        // Always reconcile status — this is the key polling value
        if (state.rideStatus !== mappedStatus) {
          console.log(`🔄 Status sync: ${state.rideStatus} → ${mappedStatus}`);
          setRideStatus(mappedStatus);
        }

        // Restore locations
        setPickupAddress(activeRide.pickupAddress.addressText);
        if (
          activeRide.pickupAddress.lat !== null &&
          activeRide.pickupAddress.lng !== null
        ) {
          setPickupLocation({
            lat: activeRide.pickupAddress.lat,
            lng: activeRide.pickupAddress.lng,
          });
        }
        setDropoffAddress(activeRide.dropoffAddress.addressText);
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
          (mappedStatus === 'confirmed' || mappedStatus === 'arrived') &&
          backendRide.startOtp
        ) {
          setStartOtp(backendRide.startOtp);
        } else if (mappedStatus === 'in-progress' || mappedStatus === 'finished') {
          setStartOtp(null); // Clear once trip has started
        }

        // Restore vehicle/ride type from backend (ECONOMY | BUSINESS)
        // This ensures TripInProgress / DriverArrived labels survive page refresh.
        if (backendRide.vehicleType) {
          const normalised = backendRide.vehicleType.toLowerCase() as 'economy' | 'business';
          if (normalised === 'economy' || normalised === 'business') {
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
            rating: activeRide.driver.rating || 5.0,
            phone: "",
          });
        }

        // Restore financials if finished
        if (mappedStatus === "finished") {
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
      setRideId,
      setRideStatus,
      setPickupLocation,
      setDropoffLocation,
      setPickupAddress,
      setDropoffAddress,
      setDriver,
      setTripSummary,
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
