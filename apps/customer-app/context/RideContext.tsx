import { authConfig, getAccessToken } from "@/services/auth.service";
import { RideService } from "@/services/ride.service";
import {
  DriverLocation,
  FareEstimate,
  Location,
  Ride,
  RidePageView,
  RideSocketEvent,
  RideStatus,
  VehicleType,
} from "@/types/ride";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

type FareOptions = { economy: number; business: number };

type RideContextType = {
  // State
  currentRide: Ride | null;
  pageView: RidePageView;
  loading: boolean;
  error: string | null;
  fareEstimate: FareEstimate | null;
  fareOptions: FareOptions | null;
  driverLocation: DriverLocation | null;

  // Booking flow
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  selectedVehicleType: VehicleType;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  setSelectedVehicleType: (type: VehicleType) => void;

  // Actions
  estimateFare: () => Promise<void>;
  createRide: (notes?: string) => Promise<string | null>;
  confirmPayment: (rideId: string, method: "CASH" | "CARD") => Promise<void>;
  cancelRide: (reason?: string) => Promise<void>;
  refreshCurrentRide: () => Promise<void>;
  resetBooking: () => void;
  /** Fully clears all ride state (ride, driver, route, fare, status). */
  resetRideState: () => void;

  // WebSocket
  socketConnected: boolean;
};

const RideContext = createContext<RideContextType | null>(null);

export function RideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRide, setCurrentRideState] = useState<Ride | null>(null);
  const [pageView, setPageViewState] = useState<RidePageView>("IDLE");

  // Wrap setters so refs stay in sync
  const setCurrentRide = (ride: Ride | null) => {
    currentRideRef.current = ride;
    setCurrentRideState(ride);
  };
  const setPageView = (view: RidePageView) => {
    pageViewRef.current = view;
    setPageViewState(view);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [fareOptions, setFareOptions] = useState<FareOptions | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(
    null,
  );
  const [socketConnected, setSocketConnected] = useState(false);

  // Booking state
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>(
    VehicleType.ECONOMY,
  );

  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  // Refs mirror state so socket handlers / async callbacks always see the latest values
  const currentRideRef = useRef<Ride | null>(null);
  const pageViewRef = useRef<RidePageView>("IDLE");

  // Map backend status to page view
  const mapStatusToPageView = useCallback(
    (status: RideStatus | string): RidePageView => {
      switch (status) {
        case RideStatus.REQUESTED:
        case RideStatus.SEARCHING_DRIVER:
          return "FINDING_DRIVER";
        case RideStatus.DRIVER_ACCEPTED:
          return "AWAITING_PAYMENT";
        case RideStatus.PAID:
          return "DRIVER_ASSIGNED";
        // Legacy mappings
        case RideStatus.ACCEPTED:
        case RideStatus.ARRIVED:
          return "DRIVER_ASSIGNED";
        case RideStatus.IN_PROGRESS:
          return "IN_PROGRESS";
        case RideStatus.COMPLETED:
          return "COMPLETED";
        case RideStatus.CANCELLED_BY_USER:
        case RideStatus.CANCELLED_BY_DRIVER:
        case RideStatus.CANCELLED:
        case RideStatus.PENDING:
        default:
          return "IDLE";
      }
    },
    [],
  );

  // Refresh current ride
  const refreshCurrentRide = useCallback(async () => {
    if (!user) return;

    try {
      const ride = await RideService.getCurrentRide();
      if (__DEV__)
        console.log("Refreshed current ride:", JSON.stringify(ride, null, 2));

      // Guard: if we're actively finding a driver and the backend hasn’t
      // caught up yet (returns null), don’t wipe the UI state.
      const inActiveSearch =
        pageViewRef.current === "FINDING_DRIVER" ||
        pageViewRef.current === "AWAITING_PAYMENT";
      const fetchedIsUseless =
        !ride ||
        (ride.status as string) === "CANCELLED_BY_USER" ||
        (ride.status as string) === "CANCELLED_BY_DRIVER" ||
        (ride.status as RideStatus) === RideStatus.CANCELLED;
      if (inActiveSearch && fetchedIsUseless) {
        if (__DEV__)
          console.log(
            "[refreshCurrentRide] Skipping update — in active search and backend returned no active ride",
          );
        return;
      }
      // Guard: if payment was already confirmed optimistically (DRIVER_ASSIGNED view)
      // but the DB still returns DRIVER_ACCEPTED (webhook hasn't completed), don't revert.
      if (
        pageViewRef.current === "DRIVER_ASSIGNED" &&
        ride &&
        (ride.status as string) === "DRIVER_ACCEPTED"
      ) {
        if (__DEV__)
          console.log(
            "[refreshCurrentRide] Skipping revert — payment confirmed optimistically, DB not yet updated",
          );
        return;
      }
      setCurrentRide(ride);

      if (ride) {
        const resolvedPageView = mapStatusToPageView(ride.status as RideStatus);
        setPageView(resolvedPageView);

        // Fetch driver location if driver is on the way or trip is active
        if (
          ride.riderId &&
          (["DRIVER_ACCEPTED", "PAID", "IN_PROGRESS"].includes(
            ride.status as string,
          ) ||
            ride.status === RideStatus.ACCEPTED ||
            ride.status === RideStatus.ARRIVED)
        ) {
          try {
            const location = await RideService.getDriverLocation(ride.id);
            setDriverLocation(location);
          } catch (err) {
            if (__DEV__) console.warn("Failed to fetch driver location:", err);
          }
        }
      } else {
        if (__DEV__) console.log("No active ride found");
        setCurrentRide(null);
        setPageView("IDLE");
        setDriverLocation(null);
      }
    } catch (err: any) {
      if (__DEV__) console.error("Failed to refresh ride:", err);
    }
  }, [user, mapStatusToPageView]);

  // Initialize WebSocket connection
  const initializeSocket = useCallback(async () => {
    if (!user?.id) return;

    // If socket already exists and is connected, do nothing
    if (socketRef.current && socketRef.current.connected) return;

    // If socket exists but is not connected, disconnect and clean up
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = await getAccessToken();

    const socket = io(authConfig.apiBase.replace("/api/v1", ""), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
      auth: { token },
    });

    socket.on("connect", () => {
      if (__DEV__) console.log("[RideContext] Socket connected");
      setSocketConnected(true);
      // User is auto-joined to user_{id} room by the server on handleConnection.
      // No client-side join emit needed.
    });

    socket.on("disconnect", () => {
      if (__DEV__) console.log("[RideContext] Socket disconnected");
      setSocketConnected(false);
    });

    // Legacy ride_update — kept as a fallback; canonical updates come via named events below
    socket.on("ride_update", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Ride update:", event);
      if (event.type === "ride_update") {
        refreshCurrentRide();
      }
    });

    // DRIVER_FOUND is superseded by DRIVER_ACCEPTED — no longer emitted by backend.
    socket.on("DRIVER_ACCEPTED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Driver accepted:", event);
      if (event.type === "DRIVER_ACCEPTED") {
        // Update current ride with driver info then show payment screen
        refreshCurrentRide();
        setPageView("AWAITING_PAYMENT");
      }
    });

    socket.on("PAYMENT_CONFIRMED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Payment confirmed:", event);
      if (event.type === "PAYMENT_CONFIRMED") {
        // Optimistically flip status to PAID so the UI doesn't flash back to
        // AWAITING_PAYMENT if refreshCurrentRide runs before the webhook writes to DB.
        setCurrentRide((prev) =>
          prev ? { ...prev, status: "PAID" as any } : prev,
        );
        setPageView("DRIVER_ASSIGNED");
        // Delay refresh to give the Paystack webhook enough time to complete its DB write
        setTimeout(() => refreshCurrentRide(), 2000);
      }
    });

    socket.on("DRIVER_ARRIVED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Driver arrived:", event);
      // ARRIVED is no longer a state change — just a notification. Keep driver_assigned view.
      if (event.type === "DRIVER_ARRIVED") {
        refreshCurrentRide();
      }
    });

    socket.on("DRIVER_LOCATION_UPDATE", (event: RideSocketEvent) => {
      if (event.type === "DRIVER_LOCATION_UPDATE") {
        setDriverLocation({
          latitude: event.metadata.lat,
          longitude: event.metadata.lng,
          heading: event.metadata.heading ?? 0,
        });
      }
    });

    socket.on("TRIP_STARTED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Trip started:", event);
      if (event.type === "TRIP_STARTED") {
        refreshCurrentRide();
        setPageView("IN_PROGRESS");
      }
    });

    socket.on("TRIP_COMPLETED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Trip completed:", event);
      if (event.type === "TRIP_COMPLETED") {
        refreshCurrentRide();
        setPageView("COMPLETED");
      }
    });

    socket.on("RIDE_CANCELLED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Ride cancelled:", event);
      if (event.type === "RIDE_CANCELLED") {
        // Only ignore if the event explicitly belongs to a DIFFERENT ride
        // (i.e. both ids are present and don't match).
        // If currentRide is null there's nothing to compare — still clear.
        const currentId = currentRideRef.current?.id;
        if (event.rideId && currentId && event.rideId !== currentId) {
          if (__DEV__)
            console.log(
              "[RideContext] RIDE_CANCELLED ignored — belongs to a different ride",
              event.rideId,
            );
          return;
        }

        // Clear all ride state
        setCurrentRide(null);
        setPageView("IDLE");
        setDriverLocation(null);
        setFareEstimate(null);
        setFareOptions(null);
        setError(null);

        // Show alert only when driver or system cancelled — not when the user
        // cancelled themselves (they already know).
        const cancelledBy = (event as any).cancelledBy as string | undefined;
        const reason = (event as any).reason as string | undefined;
        if (cancelledBy !== "CUSTOMER") {
          const title =
            cancelledBy === "DRIVER" ? "Driver Cancelled" : "Ride Cancelled";
          const message =
            reason && reason.trim()
              ? reason
              : cancelledBy === "DRIVER"
                ? "Your driver has cancelled the ride. Please book a new ride."
                : "Your ride was cancelled. Please try again.";
          Alert.alert(title, message, [{ text: "OK" }]);
        }
      }
    });

    socket.on("NO_DRIVERS_FOUND", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] No drivers found:", event);
      if (event.type === "NO_DRIVERS_FOUND") {
        setError("No drivers available at the moment. Please try again.");
      }
    });

    socketRef.current = socket;
  }, [user?.id, refreshCurrentRide]);

  // Cleanup socket on unmount or when user changes
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user?.id]);

  // Initialize socket when user is available
  useEffect(() => {
    if (user?.id) {
      initializeSocket();
    }
  }, [user?.id, initializeSocket]);

  // Reconnect socket when app comes back to the foreground (handles silent TCP drops)
  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          const socket = socketRef.current;
          if (socket && !socket.connected) {
            if (__DEV__)
              console.log(
                "[RideContext] App foregrounded — reconnecting socket",
              );
            socket.connect();
          }
        }
      },
    );
    return () => subscription.remove();
  }, [user?.id]);

  // Fetch current ride on mount so app resumes correctly after restart
  useEffect(() => {
    if (user?.id) {
      refreshCurrentRide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Update fareEstimate totalFare when vehicle type changes (if fareOptions available)
  useEffect(() => {
    if (!fareOptions) return;
    const totalFare =
      selectedVehicleType === VehicleType.BUSINESS
        ? fareOptions.business
        : fareOptions.economy;
    setFareEstimate((prev) =>
      prev
        ? {
            ...prev,
            fareBreakdown: { ...prev.fareBreakdown, totalFare },
          }
        : prev,
    );
  }, [selectedVehicleType, fareOptions]);

  // Estimate fare
  const estimateFare = useCallback(async () => {
    if (!pickupLocation || !dropoffLocation) {
      setError("Please select both pickup and dropoff locations");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await RideService.estimateRide({
        pickupLat: pickupLocation.latitude,
        pickupLng: pickupLocation.longitude,
        dropoffLat: dropoffLocation.latitude,
        dropoffLng: dropoffLocation.longitude,
        vehicleType: selectedVehicleType,
      });

      // Map backend response to FareEstimate type
      const options: FareOptions = {
        economy: Number(response.economyPrice ?? response.price),
        business: Number(
          response.businessPrice ?? Math.round(Number(response.price) * 1.5),
        ),
      };
      setFareOptions(options);

      const totalFare =
        selectedVehicleType === VehicleType.BUSINESS
          ? options.business
          : options.economy;

      const estimate: FareEstimate = {
        distanceKm: response.distance.meters / 1000,
        durationMin: response.eta.seconds / 60,
        fareBreakdown: {
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          platformFee: 0,
          driverFee: 0,
          totalFare,
        },
      };

      if (__DEV__) console.log("Estimate:", estimate, "Options:", options);

      setFareEstimate(estimate);
    } catch (err: any) {
      setError(err?.message || "Failed to estimate fare");
      if (__DEV__) console.error("Fare estimation error:", err);
    } finally {
      setLoading(false);
    }
  }, [pickupLocation, dropoffLocation, selectedVehicleType]);

  // Create ride
  const createRide = useCallback(
    async (notes?: string): Promise<string | null> => {
      if (!pickupLocation || !dropoffLocation) {
        setError("Please select both pickup and dropoff locations");
        return null;
      }

      if (!fareEstimate) {
        setError("Please get fare estimate first");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await RideService.requestRide({
          pickupLocation,
          dropoffLocation,
          vehicleType: selectedVehicleType,
          fare: fareEstimate.fareBreakdown.totalFare,
          distanceKm: fareEstimate.distanceKm,
          durationMin: fareEstimate.durationMin,
          notes,
        });

        setCurrentRide(response.ride);
        // Matching starts immediately after request — go directly to finding-driver
        setPageView("FINDING_DRIVER");
        return response.ride.id;
      } catch (err: any) {
        if (err?.message?.includes("active ride")) {
          setError("You already have an active ride");
          await refreshCurrentRide();
        } else {
          setError(err?.message || "Failed to create ride");
        }
        if (__DEV__) console.error("Create ride error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      pickupLocation,
      dropoffLocation,
      selectedVehicleType,
      fareEstimate,
      refreshCurrentRide,
    ],
  );

  // Confirm payment (called after DRIVER_ACCEPTED — transitions ride to PAID)
  const confirmPayment = useCallback(
    async (rideId: string, method: "CASH" | "CARD") => {
      setLoading(true);
      setError(null);

      try {
        await RideService.confirmRide(rideId, method);
        // Optimistically set DRIVER_ASSIGNED; socket PAYMENT_CONFIRMED will also fire
        setPageView("DRIVER_ASSIGNED");
        await refreshCurrentRide();
      } catch (err: any) {
        setError(err?.message || "Failed to confirm payment");
        if (__DEV__) console.error("Confirm payment error:", err);
      } finally {
        setLoading(false);
      }
    },
    [refreshCurrentRide],
  );

  // Cancel ride
  const cancelRide = useCallback(
    async (reason?: string) => {
      if (!currentRide) return;

      setLoading(true);
      setError(null);

      // Require a non-empty reason — fall back to a default so the API never
      // rejects with a 400 on existing callers that pass nothing.
      const resolvedReason = reason?.trim() || "Cancelled by customer";

      try {
        await RideService.cancelRide(currentRide.id, {
          reason: resolvedReason,
        });
        // Inline reset to avoid stale closure on resetBooking dependency
        setCurrentRide(null);
        setPageView("IDLE");
        setDriverLocation(null);
        setPickupLocation(null);
        setDropoffLocation(null);
        setSelectedVehicleType(VehicleType.ECONOMY);
        setFareEstimate(null);
        setFareOptions(null);
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Failed to cancel ride");
        if (__DEV__) console.error("Cancel ride error:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentRide, setPickupLocation, setDropoffLocation],
  );

  // Reset booking state
  const resetBooking = useCallback(() => {
    setPickupLocation(null);
    setDropoffLocation(null);
    setSelectedVehicleType(VehicleType.ECONOMY);
    setFareEstimate(null);
    setFareOptions(null);
    setError(null);
    setCurrentRide(null);
    setPageView("IDLE");
  }, []);

  /**
   * Full ride state reset — clears ride, driver, route data, fare and status.
   * Use this when a ride ends (completed / cancelled) to guarantee no stale
   * data leaks into the next booking flow.
   */
  const resetRideState = useCallback(() => {
    setCurrentRide(null);
    setPageView("IDLE");
    setDriverLocation(null);
    setFareEstimate(null);
    setFareOptions(null);
    setPickupLocation(null);
    setDropoffLocation(null);
    setSelectedVehicleType(VehicleType.ECONOMY);
    setError(null);
  }, []);

  const value: RideContextType = {
    currentRide,
    pageView,
    loading,
    error,
    fareEstimate,
    fareOptions,
    driverLocation,
    pickupLocation,
    dropoffLocation,
    selectedVehicleType,
    setPickupLocation,
    setDropoffLocation,
    setSelectedVehicleType,
    estimateFare,
    createRide,
    confirmPayment,
    cancelRide,
    refreshCurrentRide,
    resetBooking,
    resetRideState,
    socketConnected,
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRide() {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error("useRide must be used within RideProvider");
  }
  return context;
}
