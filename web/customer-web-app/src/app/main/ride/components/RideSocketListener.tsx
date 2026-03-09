"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import {
  subscribeToRideEvents,
  unsubscribeFromRideEvents,
  socketService,
  type NoDriversFoundEvent,
  type DriverAcceptedEvent,
} from "@/services/socket.service";
import { RideService } from "@/services/ride.service";
import { devLog } from "@/lib/logger"; // M4: PII-safe dev-only logger

/** How often to poll driver location via REST when socket has not delivered an update */
const DRIVER_LOCATION_POLL_MS = 5_000;

export function RideSocketListener() {
  const { data: session } = useSession();

  const rideId = useRideStore((state) => state.rideId);
  const rideStatus = useRideStore((state) => state.rideStatus);
  const setRideId = useRideStore((state) => state.setRideId);
  const setDriver = useRideStore((state) => state.setDriver);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setDriverLocation = useRideStore((state) => state.setDriverLocation);
  const setDriverHeading = useRideStore((state) => state.setDriverHeading);
  const setDriverEta = useRideStore((state) => state.setDriverEta);
  const setTripSummary = useRideStore((state) => state.setTripSummary);

  // Track whether we've received at least one live socket location update so
  // we can skip the costly REST poll when the socket is working fine.
  const receivedSocketLocation = useRef(false);

  // ─── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;

    devLog(`📡 Initializing Socket Listener for Ride: ${rideId}`);
    receivedSocketLocation.current = false;

    subscribeToRideEvents({
      // 0. Ride Matching Started — emitted by backend when CARD payment is confirmed
      //    and the ride transitions from PENDING → REQUESTED.
      //    Backend event: "ride_update" with type: "SEARCHING_DRIVER".
      onRideUpdate: (data) => {
        try {
          if (data.rideId !== rideId) return;

          if (data.type === "SEARCHING_DRIVER") {
            devLog(
              "💳 Card payment confirmed — driver matching started for ride:",
              rideId,
            );
            // Ensure UI shows the searching/finding-driver screen
            setRideStatus("searching");
          }
        } catch (error) {
          console.error("Socket error (onRideUpdate):", error);
        }
      },

      // 1. Driver Accepted — backend emits DRIVER_ACCEPTED with flat payload
      onDriverAccepted: (data: DriverAcceptedEvent) => {
        try {
          // Guard: ignore events for a different ride
          if (data.rideId !== rideId) return;

          const { driver } = data;
          devLog("✅ Driver Accepted:", driver.name);

          setDriver({
            name: driver.name,
            // Socket payload does NOT include image or rating (C1 fix).
            // REST sync (useRideSynchronization) will backfill from the
            // full backend ride object within seconds.
            photoUrl: "/profile.jpg",
            vehicle: {
              make: driver.vehicle?.brand || "Vehicle",
              model: driver.vehicle?.model || "Car",
              licensePlate: driver.vehicle?.plateNumber || "---",
            },
            rating: null,
            phone: driver.phone,
          });
          // Post-ride payment model: go straight to 'confirmed' — payment
          // is collected after the ride completes (no pre-ride payment gate).
          setRideStatus("confirmed");
          toast.success(`Driver found! They're on their way.`);
        } catch (error) {
          console.error("Socket error (onDriverAccepted):", error);
          toast.error("Error processing driver assignment.");
        }
      },

      // 2. Real-time Driver Location Updates
      //    Backend wraps data in a `metadata` object:
      //    { type: 'DRIVER_LOCATION_UPDATE', metadata: { lat, lng, heading, rideId } }
      onDriverLocationUpdate: (data) => {
        try {
          const meta = data.metadata;
          if (!meta) return;
          if (meta.rideId !== rideId) return;

          receivedSocketLocation.current = true; // socket is delivering — skip REST poll
          setDriverLocation({
            lat: meta.lat,
            lng: meta.lng,
          });
          if (meta.heading) {
            setDriverHeading(meta.heading);
          }
        } catch (error) {
          console.error("Socket error (onDriverLocationUpdate):", error);
        }
      },

      // 3. Driver Arrived at Pickup
      //    Backend has two emission sites with different shapes, so we
      //    normalise by checking both locations for the rideId.
      onDriverArrived: (data) => {
        try {
          const eventRideId = data.rideId ?? data.metadata?.rideId;
          if (eventRideId !== rideId) return;

          setRideStatus("arrived");
          toast.info("Driver has arrived at pickup point!");
        } catch (error) {
          console.error("Socket error (onDriverArrived):", error);
        }
      },

      // 4. Trip Started (OTP verified)
      onTripStarted: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideStatus("in-progress");
          toast.info("Trip started.");
        } catch (error) {
          console.error("Socket error (onTripStarted):", error);
        }
      },

      // 5. Trip Completed — transition to payment (post-ride payment model)
      onTripCompleted: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideStatus("payment-required");
          toast.success("Trip completed! Please complete your payment.");

          // H6 fix: immediately fetch the completed ride to populate
          // tripSummary (fare / distance / duration) so PostRidePayment
          // shows the real fare instead of the locked estimate.
          const token = session?.accessToken;
          if (token && rideId) {
            RideService.getCurrentRide(token)
              .then((ride) => {
                if (ride && ride.totalFare != null) {
                  setTripSummary({
                    fare: ride.totalFare,
                    distance: ride.distanceKm ?? 0,
                    duration: ride.durationMin ?? 0,
                  });
                }
              })
              .catch((err) => {
                // Non-fatal — polling will pick it up on next cycle
                console.warn("[RideSocketListener] Failed to fetch trip summary:", err);
              });
          }
        } catch (error) {
          console.error("Socket error (onTripCompleted):", error);
        }
      },

      // 6. Ride Cancelled
      onRideCancelled: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideId(null);
          setRideStatus("idle");
          toast.error("Ride was cancelled.");
        } catch (error) {
          console.error("Socket error (onRideCancelled):", error);
        }
      },

      // 7. No Drivers Found — backend exhausted all matching attempts and auto-cancelled
      //    Backend payload is FLAT: { type, rideId, reason }
      onNoDriversFound: (data: NoDriversFoundEvent) => {
        try {
          // Guard: only process if it belongs to the current ride
          if (data.rideId && data.rideId !== rideId) return;

          devLog("[RideSocketListener] NO_DRIVERS_FOUND for ride:", rideId);
          // Reset to idle so the user can book again
          setRideStatus("idle");
          setRideId(null);
          toast.error(
            data.reason ||
              "No drivers available in your area. Please try again.",
            { autoClose: 6000 },
          );
        } catch (error) {
          console.error("Socket error (onNoDriversFound):", error);
        }
      },
    });

    // 8. Post-ride payment confirmed via Paystack webhook
    const socket = socketService.getSocket();
    const handleRidePaymentCompleted = (data: any) => {
      try {
        if (data.rideId !== rideId) return;
        setRideStatus("finished");
        toast.success("Payment confirmed!");
      } catch (error) {
        console.error("Socket error (RIDE_PAYMENT_COMPLETED):", error);
      }
    };
    socket?.on("RIDE_PAYMENT_COMPLETED", handleRidePaymentCompleted);

    // Cleanup on unmount or rideId change
    return () => {
      devLog(`🔌 Disconnecting Socket Listener for Ride: ${rideId}`);
      unsubscribeFromRideEvents();
      socket?.off("RIDE_PAYMENT_COMPLETED", handleRidePaymentCompleted);
    };
  }, [
    rideId,
    setRideId,
    setDriver,
    setRideStatus,
    setDriverLocation,
    setDriverHeading,
    setTripSummary,
    session?.accessToken,
  ]);

  // ─── Driver location REST polling (fallback when socket isn't rebroadcasting) ─
  // The backend gateway currently only saves rider GPS to Redis; it doesn't
  // re-emit DRIVER_LOCATION_UPDATE to the customer room.  Poll the REST endpoint
  // every 5s while the ride is active as a reliable fallback.
  useEffect(() => {
    const needsLocation =
      rideStatus === "confirmed" ||
      rideStatus === "arrived" ||
      rideStatus === "in-progress";
    if (!rideId || !session?.accessToken || !needsLocation) return;

    const poll = async () => {
      // If socket has recently delivered a location, skip this cycle.
      if (receivedSocketLocation.current) {
        receivedSocketLocation.current = false; // reset flag so next cycle re-evaluates
        return;
      }

      try {
        const loc = await RideService.getDriverLocation(
          rideId,
          session.accessToken!,
        );
        if (loc && (loc.latitude !== 0 || loc.longitude !== 0)) {
          setDriverLocation({ lat: loc.latitude, lng: loc.longitude });
          if (loc.heading) setDriverHeading(loc.heading);
          // Update backend-computed ETA
          if (loc.etaMinutes != null && loc.distanceKm != null) {
            setDriverEta({ minutes: loc.etaMinutes, km: loc.distanceKm });
          }
        }
      } catch {
        // Silently ignore — socket or next poll will recover
      }
    };

    const interval = setInterval(poll, DRIVER_LOCATION_POLL_MS);
    return () => clearInterval(interval);
  }, [
    rideId,
    rideStatus,
    session?.accessToken,
    setDriverLocation,
    setDriverHeading,
    setDriverEta,
  ]);

  return null;
}
