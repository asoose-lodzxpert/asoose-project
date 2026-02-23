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
    (status: RideStatus): RidePageView => {
      switch (status) {
        case RideStatus.PENDING:
          return "PAYMENT";
        case RideStatus.REQUESTED:
          return "FINDING_DRIVER";
        case RideStatus.ACCEPTED:
          return "DRIVER_ASSIGNED";
        case RideStatus.ARRIVED:
          return "DRIVER_ARRIVED";
        case RideStatus.IN_PROGRESS:
          return "IN_PROGRESS";
        case RideStatus.COMPLETED:
          return "COMPLETED";
        case RideStatus.CANCELLED:
          return "IDLE";
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

      // Guard: if we're in the middle of a new PAYMENT flow and the backend
      // hasn't caught up yet (returns null or the old cancelled ride), don't
      // wipe the newly created ride out of state.
      const inPaymentFlow = pageViewRef.current === "PAYMENT";
      const fetchedIsUseless =
        !ride || (ride.status as RideStatus) === RideStatus.CANCELLED;
      if (inPaymentFlow && fetchedIsUseless) {
        if (__DEV__)
          console.log(
            "[refreshCurrentRide] Skipping update — in PAYMENT flow and backend returned no active ride",
          );
        return;
      }

      setCurrentRide(ride);

      if (ride) {
        let resolvedPageView = mapStatusToPageView(ride.status as RideStatus);
        // If ride is PENDING but payment is already COMPLETED (e.g. app was
        // killed mid-flow), skip the payment screen and look for a driver.
        const ridePayment = Array.isArray(ride.payment)
          ? ride.payment[0]
          : ride.payment;
        if (
          resolvedPageView === "PAYMENT" &&
          ridePayment?.status === "COMPLETED"
        ) {
          resolvedPageView = "FINDING_DRIVER";
        }
        setPageView(resolvedPageView);

        // Fetch driver location if ride is active
        if (
          ride.riderId &&
          (ride.status === RideStatus.ACCEPTED ||
            ride.status === RideStatus.ARRIVED ||
            ride.status === RideStatus.IN_PROGRESS)
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
      reconnectionAttempts: 5,
      auth: { token },
    });

    socket.on("connect", () => {
      if (__DEV__) console.log("[RideContext] Socket connected");
      setSocketConnected(true);
      // Join user's room
      socket.emit("join", `user_${user.id}`);
    });

    socket.on("disconnect", () => {
      if (__DEV__) console.log("[RideContext] Socket disconnected");
      setSocketConnected(false);
    });

    // Handle ride updates
    socket.on("ride_update", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Ride update:", event);
      if (event.type === "ride_update") {
        refreshCurrentRide();
      }
    });

    socket.on("DRIVER_FOUND", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Driver found:", event);
      if (event.type === "DRIVER_FOUND") {
        refreshCurrentRide();
        setPageView("DRIVER_ASSIGNED");
      }
    });

    socket.on("DRIVER_ARRIVED", (event: RideSocketEvent) => {
      if (__DEV__) console.log("[RideContext] Driver arrived:", event);
      if (event.type === "DRIVER_ARRIVED") {
        refreshCurrentRide();
        setPageView("DRIVER_ARRIVED");
      }
    });

    socket.on("DRIVER_LOCATION_UPDATE", (event: RideSocketEvent) => {
      if (event.type === "DRIVER_LOCATION_UPDATE") {
        setDriverLocation({
          latitude: event.metadata.location.lat,
          longitude: event.metadata.location.lng,
          heading: event.metadata.location.heading,
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
        setCurrentRide(null);
        setPageView("IDLE");
        setDriverLocation(null);
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
        setPageView("PAYMENT");
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

  // Confirm payment
  const confirmPayment = useCallback(
    async (rideId: string, method: "CASH" | "CARD") => {
      setLoading(true);
      setError(null);

      try {
        await RideService.confirmRide(rideId, method);
        await refreshCurrentRide();
        setPageView("FINDING_DRIVER");
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

      try {
        await RideService.cancelRide(currentRide.id, { reason });
        // Inline reset to avoid stale closure on resetBooking dependency
        setCurrentRide(null);
        setPageView("IDLE");
        setDriverLocation(null);
        setPickupLocation(null);
        setDropoffLocation(null);
        setSelectedVehicleType(VehicleType.ECONOMY);
        setFareEstimate(null);
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
