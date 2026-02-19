"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import {
  subscribeToRideEvents,
  unsubscribeFromRideEvents,
  socketService,
} from "@/services/socket.service";
import { RideService } from "@/services/ride.service";

/** How often to poll driver location via REST when socket has not delivered an update */
const DRIVER_LOCATION_POLL_MS = 5_000;

export function RideSocketListener() {
  const { data: session } = useSession();

  const rideId = useRideStore((state) => state.rideId);
  const rideStatus = useRideStore((state) => state.rideStatus);
  const setDriver = useRideStore((state) => state.setDriver);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setDriverLocation = useRideStore((state) => state.setDriverLocation);
  const setDriverHeading = useRideStore((state) => state.setDriverHeading);
  const setTripSummary = useRideStore((state) => state.setTripSummary);

  // Track whether we've received at least one live socket location update so
  // we can skip the costly REST poll when the socket is working fine.
  const receivedSocketLocation = useRef(false);

  // ─── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;

    console.log(`📡 Initializing Socket Listener for Ride: ${rideId}`);
    receivedSocketLocation.current = false;

    // Also subscribe to ride_update (FINDING_DRIVER emitted by backend on confirm)
    const handleRideUpdate = (data: any) => {
      if (data?.rideId && data.rideId !== rideId) return;
      if (
        data?.type === "FINDING_DRIVER" ||
        data?.status === "FINDING_DRIVER"
      ) {
        setRideStatus("searching");
      }
    };
    socketService.on("ride_update", handleRideUpdate);

    subscribeToRideEvents({
      // 0. Ride Matching Started — emitted by backend when CARD payment is confirmed
      //    and the ride transitions from PENDING → REQUESTED.
      onRideUpdate: (data) => {
        try {
          if (data.rideId !== rideId) return;

          if (data.type === 'FINDING_DRIVER') {
            console.log('💳 Card payment confirmed — driver matching started for ride:', rideId);
            // Ensure UI shows the searching/finding-driver screen
            setRideStatus('searching');
          }
        } catch (error) {
          console.error('Socket error (onRideUpdate):', error);
        }
      },

      // 1. Driver Found — backend emits DRIVER_FOUND with real vehicle data
      onDriverFound: (data) => {
        try {
          // Guard: ignore events for a different ride
          if (data.metadata.rideId !== rideId) return;

          const { driver } = data.metadata;
          console.log("✅ Driver Found:", driver.name);

          setDriver({
            name: driver.name,
            photoUrl: "/profile.jpg",
            vehicle: {
              make: driver.vehicle?.brand || "Vehicle",
              model: driver.vehicle?.model || "Car",
              licensePlate: driver.vehicle?.plateNumber || "---",
            },
            rating: 5.0, // Backend doesn't send rating in this event
            phone: driver.phone,
          });
          setRideStatus("confirmed");
          toast.success(`Driver found! ${driver.name} is on the way.`);
        } catch (error) {
          console.error("Socket error (onDriverFound):", error);
          toast.error("Error processing driver assignment.");
        }
      },

      // 2. Real-time Driver Location Updates (emitted by rider app via socket relay)
      onDriverLocationUpdate: (data) => {
        try {
          if (data.metadata.rideId !== rideId) return;

          receivedSocketLocation.current = true; // socket is delivering — skip REST poll
          setDriverLocation({
            lat: data.metadata.lat,
            lng: data.metadata.lng,
          });
          if (data.metadata.heading) {
            setDriverHeading(data.metadata.heading);
          }
        } catch (error) {
          console.error("Socket error (onDriverLocationUpdate):", error);
        }
      },

      // 3. Driver Arrived at Pickup
      onDriverArrived: (data) => {
        try {
          if (data.metadata.rideId !== rideId) return;

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

      // 5. Trip Completed
      onTripCompleted: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideStatus("finished");
          toast.success("Trip completed!");

          // Fetch final trip summary for the rating screen
          if (session?.accessToken) {
            RideService.getCurrentRide(session.accessToken)
              .then((ride) => {
                if (ride) {
                  setTripSummary({
                    fare: ride.totalFare || ride.estimatedFare || 0,
                    distance: ride.distanceKm || 0,
                    duration: 0,
                  });
                }
              })
              .catch((err) => {
                console.error("Failed to fetch final trip summary:", err);
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

          setRideStatus("idle");
          toast.error("Ride was cancelled.");
        } catch (error) {
          console.error("Socket error (onRideCancelled):", error);
        }
      },
    });

    // Cleanup on unmount or rideId change
    return () => {
      console.log(`🔌 Disconnecting Socket Listener for Ride: ${rideId}`);
      socketService.off("ride_update", handleRideUpdate);
      unsubscribeFromRideEvents();
    };
  }, [
    rideId,
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
  ]);

  return null;
}
