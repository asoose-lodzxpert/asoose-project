import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { RideService } from "@/services/ride.service";
import {
  Ride,
  RideStatus,
  RidePageView,
  FareEstimate,
  DriverLocation,
  Location,
  VehicleType,
  RideSocketEvent,
} from "@/types/ride";
import { useAuth } from "./AuthContext";
import { io, Socket } from "socket.io-client";
import { authConfig } from "@/services/auth.service";

type RideContextType = {
  // State
  currentRide: Ride | null;
  pageView: RidePageView;
  loading: boolean;
  error: string | null;
  fareEstimate: FareEstimate | null;
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
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [pageView, setPageView] = useState<RidePageView>("IDLE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
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
      setCurrentRide(ride);

      if (ride) {
        setPageView(mapStatusToPageView(ride.status as RideStatus));

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
            console.warn("Failed to fetch driver location:", err);
          }
        }
      } else {
        setPageView("IDLE");
        setDriverLocation(null);
      }
    } catch (err: any) {
      console.error("Failed to refresh ride:", err);
    }
  }, [user, mapStatusToPageView]);

  // Initialize WebSocket connection
  const initializeSocket = useCallback(() => {
    if (!user?.id || socketRef.current?.connected) return;

    const socket = io(authConfig.apiBase.replace("/api/v1", ""), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("[RideContext] Socket connected");
      setSocketConnected(true);
      // Join user's room
      socket.emit("join", `user_${user.id}`);
    });

    socket.on("disconnect", () => {
      console.log("[RideContext] Socket disconnected");
      setSocketConnected(false);
    });

    // Handle ride updates
    socket.on("ride_update", (event: RideSocketEvent) => {
      console.log("[RideContext] Ride update:", event);
      if (event.type === "ride_update") {
        refreshCurrentRide();
      }
    });

    socket.on("DRIVER_FOUND", (event: RideSocketEvent) => {
      console.log("[RideContext] Driver found:", event);
      if (event.type === "DRIVER_FOUND") {
        refreshCurrentRide();
        setPageView("DRIVER_ASSIGNED");
      }
    });

    socket.on("DRIVER_ARRIVED", (event: RideSocketEvent) => {
      console.log("[RideContext] Driver arrived:", event);
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
      console.log("[RideContext] Trip started:", event);
      if (event.type === "TRIP_STARTED") {
        refreshCurrentRide();
        setPageView("IN_PROGRESS");
      }
    });

    socket.on("TRIP_COMPLETED", (event: RideSocketEvent) => {
      console.log("[RideContext] Trip completed:", event);
      if (event.type === "TRIP_COMPLETED") {
        refreshCurrentRide();
        setPageView("COMPLETED");
      }
    });

    socket.on("RIDE_CANCELLED", (event: RideSocketEvent) => {
      console.log("[RideContext] Ride cancelled:", event);
      if (event.type === "RIDE_CANCELLED") {
        setCurrentRide(null);
        setPageView("IDLE");
      }
    });

    socket.on("NO_DRIVERS_FOUND", (event: RideSocketEvent) => {
      console.log("[RideContext] No drivers found:", event);
      if (event.type === "NO_DRIVERS_FOUND") {
        setError("No drivers available at the moment. Please try again.");
      }
    });

    socketRef.current = socket;
  }, [user?.id, refreshCurrentRide]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Initialize socket when user is available
  useEffect(() => {
    if (user?.id) {
      initializeSocket();
    }
  }, [user?.id, initializeSocket]);

  // Check for active ride on mount
  useEffect(() => {
    refreshCurrentRide();
  }, [refreshCurrentRide]);

  // Poll for driver location updates (fallback if socket fails)
  useEffect(() => {
    if (
      currentRide?.riderId &&
      (currentRide.status === RideStatus.ACCEPTED ||
        currentRide.status === RideStatus.ARRIVED ||
        currentRide.status === RideStatus.IN_PROGRESS)
    ) {
      // Poll every 5 seconds
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const location = await RideService.getDriverLocation(currentRide.id);
          setDriverLocation(location);
        } catch (err) {
          console.warn("Failed to poll driver location:", err);
        }
      }, 5000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentRide]);

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
      });

      // Map backend response to FareEstimate type
      const estimate: FareEstimate = {
        distanceKm: response.distance.meters / 1000,
        durationMin: response.eta.seconds / 60,
        fareBreakdown: {
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          platformFee: 0,
          driverFee: 0,
          totalFare: Number(response.price),
        },
      };

      console.log("Estimate:", estimate);

      setFareEstimate(estimate);
    } catch (err: any) {
      setError(err?.message || "Failed to estimate fare");
      console.error("Fare estimation error:", err);
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
        console.error("Create ride error:", err);
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
        console.error("Confirm payment error:", err);
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
        setCurrentRide(null);
        setPageView("IDLE");
        setDriverLocation(null);
        resetBooking();
      } catch (err: any) {
        setError(err?.message || "Failed to cancel ride");
        console.error("Cancel ride error:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentRide],
  );

  // Reset booking state
  const resetBooking = useCallback(() => {
    setPickupLocation(null);
    setDropoffLocation(null);
    setSelectedVehicleType(VehicleType.ECONOMY);
    setFareEstimate(null);
    setError(null);
  }, []);

  const value: RideContextType = {
    currentRide,
    pageView,
    loading,
    error,
    fareEstimate,
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
