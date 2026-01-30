"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Crosshair, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import GoogleMapView from "./components/map";
import RideSelector, { RideRequestPayload, PriceEstimate, AVAILABLE_RIDE_TYPES } from "./components/RideSelector";
import DriverStatusUI from "./components/DriverStatus";
import TripProgressUI from "./components/TripProgressUI";
import TripCompleteUI from "./components/TripCompleteUi";
import FindingDriverUI from "./components/findingDriverui";
import { DriverStatusSkeleton } from "./components/Skeleton";
import {
  RideService,
  VehicleType,
  Driver,
  Ride,
  RideStatus,
} from "@/services/ride.service";
import { useRideSocket } from "@/hooks/useRideSocket";
import { paymentService } from "@/services/payment.service";
import { z } from "zod";
import { PAYMENT_METHODS } from "./constants/config";
import { useDebounce } from "@/hooks/useDebounce";

// --- Types ---
// TASK 5 FIX: Added "PROCESSING_PAYMENT" to separate payment wait from driver search
type PageView = "IDLE" | "PROCESSING_PAYMENT" | "FINDING_DRIVER" | "ON_WAY" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";

interface SessionWithToken {
  accessToken?: string;
  user?: { accessToken?: string; email?: string };
}

// --- Validation Schemas (TASK 5 FIX) ---

// Strict Vehicle Schema (Replaces z.any())
const VehicleSchema = z.object({
  brand: z.string(),
  model: z.string(),
  plateNumber: z.string(),
  color: z.string(),
});

const DriverFoundSchema = z.object({
  type: z.literal("DRIVER_FOUND"),
  metadata: z.object({
    rideId: z.string(),
    driver: z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
      vehicle: VehicleSchema, // STRICT validation
      rating: z.number().optional(),
    }),
  }),
});

const LocationUpdateSchema = z.object({
  type: z.literal("DRIVER_LOCATION_UPDATE"),
  metadata: z.object({
    lat: z.number(),
    lng: z.number(),
    heading: z.number().optional().default(0), // TASK 4 FIX: Added heading
  }),
});

// --- Custom Hooks ---

function useToken(session: any) {
  return useMemo(() => {
    const typedSession = session as SessionWithToken;
    return typedSession?.accessToken || typedSession?.user?.accessToken || null;
  }, [session]);
}

function usePriceEstimator(
  locations: { userLocation: google.maps.LatLngLiteral | null; destLocation: google.maps.LatLngLiteral | null },
  vehicleType: VehicleType,
  token: string | null
) {
  const [priceEstimates, setPriceEstimates] = useState<PriceEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedLocations = useDebounce(locations, 500);

  useEffect(() => {
    if (!debouncedLocations.userLocation || !debouncedLocations.destLocation || !token) {
      setPriceEstimates(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsCalculating(true);

    RideService.getEstimate(
      {
        pickupLat: debouncedLocations.userLocation.lat,
        pickupLng: debouncedLocations.userLocation.lng,
        dropoffLat: debouncedLocations.destLocation.lat,
        dropoffLng: debouncedLocations.destLocation.lng,
        vehicleType,
      },
      token
    )
      // FIX: Explicitly cast 'data' to 'PriceEstimate'
      .then((data) => setPriceEstimates(data as PriceEstimate))
      .catch((err: any) => {
        if (err.name !== "AbortError") console.error("Estimate failed", err);
      })
      .finally(() => setIsCalculating(false));

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [debouncedLocations, vehicleType, token]);

  return { priceEstimates, isCalculating };
}

function useRideState() {
  const [rideStage, setRideStage] = useState<PageView>("IDLE");
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

  const resetApp = useCallback(() => {
    setRideStage("IDLE");
    setActiveRideId(null);
    setErrorState(null);
  }, []);

  return { rideStage, setRideStage, activeRideId, setActiveRideId, errorState, setErrorState, resetApp };
}

// --- Main Component ---
export default function Page() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isLoaded: isGoogleLoaded } = useGoogleMaps();
  const token = useToken(session);

  // Custom hooks
  const {
    rideStage,
    setRideStage,
    activeRideId,
    setActiveRideId,
    errorState,
    setErrorState,
    resetApp,
  } = useRideState();

  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>("CAR");
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [destLocation, setDestLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<google.maps.LatLngLiteral & { heading?: number } | undefined>(undefined);

  // Price estimation hook
  // FIX: Wrapped in useMemo to prevent infinite render loops in usePriceEstimator
  const locations = useMemo(() => ({ 
    userLocation, 
    destLocation 
  }), [userLocation, destLocation]);

  const { priceEstimates, isCalculating } = usePriceEstimator(locations, selectedVehicleType, token);

  // TASK 5 FIX: Status Mapping
  // Explicitly map PENDING to PROCESSING_PAYMENT so the user knows why they are waiting
  const mapBackendStatusToFrontend = (status: RideStatus): PageView => {
    const mapping: Record<RideStatus, PageView> = {
      PENDING: "PROCESSING_PAYMENT",
      REQUESTED: "FINDING_DRIVER",
      ACCEPTED: "ON_WAY",
      ARRIVED: "ARRIVED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "IDLE",
    };
    return mapping[status] || "IDLE";
  };

  // Restore active ride (stable deps)
  useEffect(() => {
    if (!token) return;

    RideService.getCurrentRide(token)
      .then((ride: Ride | null) => {
        if (ride) {
          setActiveRideId(ride.id);
          setRideStage(mapBackendStatusToFrontend(ride.status));
          if (ride.pickupAddress?.address) setPickupAddress(ride.pickupAddress.address);
          if (ride.dropoffAddress?.address) setDestinationAddress(ride.dropoffAddress.address);
          if (ride.driver) setDriverInfo(ride.driver);
        }
      })
      .catch((err) => console.error("Failed to fetch current ride:", err));
  }, [token]);

  // Secure socket handler with validation
  const handleSocketEvent = useCallback((event: unknown) => {
    try {
      // Validate critical events
      if ((event as any)?.type === "DRIVER_FOUND") {
        const parsed = DriverFoundSchema.parse(event);
        setRideStage("ON_WAY");
        setDriverInfo(parsed.metadata.driver);
        setActiveRideId(parsed.metadata.rideId);
      } else if ((event as any)?.type === "DRIVER_LOCATION_UPDATE") {
        const parsed = LocationUpdateSchema.parse(event);
        // TASK 4 FIX: Pass heading to map view
        setDriverLocation({
          lat: parsed.metadata.lat,
          lng: parsed.metadata.lng,
          heading: parsed.metadata.heading
        });
      } else {
        // Handle other known events safely
        const { type } = event as any;
        switch (type) {
          case "DRIVER_ARRIVED":
            setRideStage("ARRIVED");
            break;
          case "TRIP_STARTED":
            setRideStage("IN_PROGRESS");
            break;
          case "TRIP_COMPLETED":
            setRideStage("COMPLETED");
            break;
          // TASK 2 FIX: Handle NO_DRIVERS_FOUND event
          case "NO_DRIVERS_FOUND":
            setRideStage("IDLE");
            setErrorState({ title: "Busy Area", message: "No drivers available. Please try again later." });
            break;
          case "RIDE_CANCELLED":
            resetApp();
            setErrorState({ title: "Ride Cancelled", message: "The ride was cancelled." });
            break;
        }
      }
    } catch (error) {
      console.error("Invalid socket event:", error);
    }
  }, [resetApp]);

  const handleReconnected = useCallback(() => {
    if (!token) return;
    RideService.getCurrentRide(token).then((ride: Ride | null) => {
      if (ride) {
        setRideStage(mapBackendStatusToFrontend(ride.status));
        if (ride.driver) setDriverInfo(ride.driver);
      } else if (rideStage !== "IDLE" && rideStage !== "COMPLETED") {
        resetApp();
      }
    });
  }, [token, rideStage, resetApp]);

  useRideSocket(token, handleSocketEvent, handleReconnected);

  // Geolocation
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation || !isGoogleLoaded) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        if (!pickupAddress) {
          const geocoder = new google.maps.Geocoder();
          try {
            const res = await geocoder.geocode({ location: coords });
            if (res.results[0]) setPickupAddress(res.results[0].formatted_address || "");
          } catch (e) {
            console.error("Geocoding failed:", e);
          }
        }
      },
      (err) => {
        setErrorState({ title: "Location Error", message: "Please enable location access." });
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [isGoogleLoaded, pickupAddress]);

  useEffect(() => {
    if (isGoogleLoaded && !userLocation) handleLocateMe();
  }, [isGoogleLoaded, userLocation, handleLocateMe]);

  // TASK 1 FIX: "Zombie Ride" Deadlock Prevention
  // Ensures we clean up if payment fails or throws
  const handleRequestRide = async (data: RideRequestPayload) => {
    if (!token || !userLocation || !destLocation) {
      setErrorState({ title: "Error", message: "Missing required information." });
      return;
    }

    setRideStage("FINDING_DRIVER");

    try {
      const stateParam = crypto.randomUUID(); // CSRF protection
      const res = await RideService.createRide(
        {
          pickupLocation: { latitude: data.pickup.lat, longitude: data.pickup.lng, address: data.pickup.address },
          dropoffLocation: { latitude: data.dropoff.lat, longitude: data.dropoff.lng, address: data.dropoff.address },
          vehicleType: data.rideType as VehicleType,
        },
        token
      );

      const selectedMethod = PAYMENT_METHODS.find((m) => m.id === data.paymentMethodId);

      // FIX 1: Explicitly check if selectedMethod exists to satisfy "possibly undefined" error
      if (!selectedMethod) {
        throw new Error("Invalid payment method selected.");
      }

      if (selectedMethod.type !== "CASH" && selectedMethod.gateway) {
        localStorage.setItem("pending_ride", "true");
        localStorage.setItem("payment_state", stateParam);

        const paymentRes = await paymentService.initiatePayment(
          {
            amount: res.payment.amount,
            email: session?.user?.email || "",
            // FIX 2: Type assertion to satisfy the strict Union Type requirement
            gateway: selectedMethod.gateway as "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY",
            method: "CARD",
            type: "RIDE",
            rideId: res.ride.id,
            state: stateParam,
          },
          token
        );

        if (paymentRes.authorizationUrl) {
          window.open(paymentRes.authorizationUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      await RideService.confirmRide(res.ride.id, "CASH", token);
      setActiveRideId(res.ride.id);
    } catch (error: any) {
      console.error(error);
      setRideStage("IDLE");
      const msg = error.message || error.response?.data?.message || "Unable to request ride.";
      setErrorState({ title: "Request Failed", message: msg });
    }
  };

  const handleCancel = async () => {
    if (activeRideId && token) {
      try {
        await RideService.cancelRide(activeRideId, "User cancelled", token);
      } catch (e) {
        console.error(e);
      }
    }
    resetApp();
    localStorage.removeItem("pending_ride");
    localStorage.removeItem("payment_state");
  };

  const renderSidebar = () => {
    switch (rideStage) {
      case "IDLE":
        return (
          <RideSelector
            pickupAddress={pickupAddress}
            destinationAddress={destinationAddress}
            onPickupSelect={(data) => {
              setPickupAddress(data.address);
              setUserLocation({ lat: data.lat, lng: data.lng });
            }}
            onDestinationSelect={(data) => {
              setDestinationAddress(data.address);
              setDestLocation({ lat: data.lat, lng: data.lng });
            }}
            priceEstimates={priceEstimates}
            isCalculatingPrice={isCalculating}
            onRequestRide={handleRequestRide}
            isRequesting={false} // <--- FIX: Simply false, because loading state shows a different UI
            isGoogleLoaded={isGoogleLoaded}
            availableRideTypes={AVAILABLE_RIDE_TYPES}
          />
        );
      case "PROCESSING_PAYMENT":
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="w-12 h-12 animate-spin text-gray-900 mb-4" />
            <h3 className="text-xl font-bold">Processing Payment</h3>
            <p className="text-gray-500 text-center mt-2">Please wait while we secure your payment...</p>
          </div>
        );
      case "FINDING_DRIVER":
        return <FindingDriverUI onCancel={handleCancel} pickupAddress={pickupAddress} dropoffAddress={destinationAddress} />;
      // ... rest of the cases remain the same
      case "ON_WAY":
      case "ARRIVED":
        return driverInfo ? (
          <DriverStatusUI
            status={rideStage}
            driver={driverInfo}
            tripDetails={{ pickup: pickupAddress, dropoff: destinationAddress }}
            onCancel={handleCancel}
          />
        ) : (
          <DriverStatusSkeleton />
        );
      case "IN_PROGRESS":
        return (
          <TripProgressUI
            destination={destinationAddress}
            driverName={driverInfo?.name || "Driver"}
            etaMinutes={driverInfo?.etaMinutes || 10}
          />
        );
      case "COMPLETED":
        return (
          <TripCompleteUI
            pickup={pickupAddress}
            dropoff={destinationAddress}
            price={priceEstimates?.CAR?.total || 0}
            driverName={driverInfo?.name || "Driver"}
            onClose={resetApp}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col md:flex-row bg-gray-100">
      <div className="absolute inset-0 z-0 md:relative md:flex-1">
        {rideStage === "IDLE" && (
          <button
            onClick={handleLocateMe}
            className="absolute bottom-32 right-4 md:bottom-8 z-[50] bg-white p-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Locate me"
          >
            <Crosshair className="w-6 h-6 text-gray-700" />
          </button>
        )}
        <GoogleMapView
          isLoaded={isGoogleLoaded}
          userPos={userLocation}
          destPos={destLocation}
          rideStage={rideStage === "PROCESSING_PAYMENT" ? "FINDING_DRIVER" : rideStage}
          driverPos={driverLocation}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[85vh] md:static md:w-[450px] md:h-full md:max-h-none md:shadow-xl">
        <div className="pointer-events-auto bg-white h-full rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none overflow-hidden relative">
          {errorState && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2">{errorState.title}</h3>
                <p className="text-gray-500 mb-6 text-sm">{errorState.message}</p>
                <button
                  onClick={() => setErrorState(null)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {renderSidebar()}
        </div>
      </div>
    </div>
  );
}