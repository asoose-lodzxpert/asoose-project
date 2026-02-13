"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertTriangle } from "lucide-react";
import { 
  RideService, 
  VehicleType, 
  mapStatusToView, 
  PriceEstimate 
} from "@/services/ride.service";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { useRideSocket } from "@/hooks/useRideSocket";
import { paymentService } from "@/services/payment.service";
import { PAYMENT_METHODS } from "./constants/config";

import GoogleMapView from "./components/map";
import RideSelector, { RideRequestPayload, AVAILABLE_RIDE_TYPES } from "./components/RideSelector";
import DriverStatusUI from "./components/DriverStatus";
import TripProgressUI from "./components/TripProgressUI";
import TripCompleteUI from "./components/TripCompleteUi";
import FindingDriverUI from "./components/findingDriverui";

interface LocationState {
  lat?: number;
  lng?: number;
  placeId?: string;
  address?: string;
}

export default function RidePage() {
  const { data: session } = useSession();
  const { isLoaded: isGoogleLoaded } = useGoogleMaps();
  const token = session?.accessToken || (session as any)?.user?.accessToken || null;

  const [rideStage, setRideStage] = useState<string>("IDLE");
  const [activeRide, setActiveRide] = useState<any>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>("CAR");
  const [priceEstimates, setPriceEstimates] = useState<PriceEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRequestingRide, setIsRequestingRide] = useState(false); 
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

  // ✅ FIX 3: Extended location state to hold `placeId`
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [destLocation, setDestLocation] = useState<LocationState | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [driverLocation, setDriverLocation] = useState<any>(undefined);

  const resetApp = useCallback(() => {
    setRideStage("IDLE");
    setActiveRide(null);
    setPriceEstimates(null);
    setIsRequestingRide(false);
    localStorage.removeItem("pending_ride");
  }, []);

  const syncRideState = useCallback(async () => {
    if (!token) return;
    try {
      const ride = await RideService.getCurrentRide(token);
      if (ride) {
        setActiveRide(ride);
        setRideStage(mapStatusToView(ride.status));
        if (ride.pickupAddress) setPickupAddress(ride.pickupAddress.address || ride.pickupAddress.street);
        if (ride.dropoffAddress) setDestinationAddress(ride.dropoffAddress.address || ride.dropoffAddress.street);
      } else if (rideStage !== "IDLE" && rideStage !== "COMPLETED") {
        resetApp();
      }
    } catch (err) {
      console.error("Failed to sync ride state", err);
    }
  }, [token, rideStage, resetApp]);

  useEffect(() => {
    syncRideState();
    if (rideStage === "PROCESSING_PAYMENT" || localStorage.getItem("pending_ride")) {
      const interval = setInterval(syncRideState, 3000);
      return () => clearInterval(interval);
    }
  }, [token, rideStage, syncRideState]);

  useEffect(() => {
    if (!userLocation || !destLocation || !token) return;
    setIsCalculating(true);
    
    // ✅ Supply Backend the newly authoritative Place IDs
    RideService.getEstimate({
      pickupPlaceId: userLocation.placeId,
      pickupLat: userLocation.lat,
      pickupLng: userLocation.lng,
      dropoffPlaceId: destLocation.placeId,
      dropoffLat: destLocation.lat,
      dropoffLng: destLocation.lng,
      vehicleType: selectedVehicleType,
    }, token)
    .then((data: any) => {
      setPriceEstimates(data[selectedVehicleType] || null);
    })
    .finally(() => setIsCalculating(false));
  }, [userLocation, destLocation, selectedVehicleType, token]);

  const handleSocketEvent = useCallback((event: any) => {
    switch (event.type) {
      case "DRIVER_FOUND":
        setRideStage("ON_WAY");
        syncRideState();
        break;
      case "DRIVER_LOCATION_UPDATE":
        setDriverLocation({ lat: event.metadata.lat, lng: event.metadata.lng, heading: event.metadata.heading });
        break;
      case "TRIP_STARTED":
        setRideStage("IN_PROGRESS");
        break;
      case "TRIP_COMPLETED":
        setRideStage("COMPLETED");
        break;
      case "RIDE_CANCELLED":
        resetApp();
        setErrorState({ title: "Cancelled", message: "The ride was cancelled by the driver or system." });
        break;
    }
  }, [syncRideState, resetApp]);

  useRideSocket(token, handleSocketEvent, syncRideState);

  const handleRequestRide = async (data: RideRequestPayload) => {
    if (!token || !priceEstimates) return;
    setIsRequestingRide(true);
    setRideStage("FINDING_DRIVER");
    setErrorState(null);
    
    try {
      // ✅ Hand off Location Truth to the Backend Resolver using DTO standards
      const res = await RideService.createRide({
        pickupLocation: { 
          addressText: data.pickup.address,
          placeId: data.pickup.placeId,
          lat: data.pickup.lat, 
          lng: data.pickup.lng 
        },
        dropoffLocation: { 
          addressText: data.dropoff.address,
          placeId: data.dropoff.placeId,
          lat: data.dropoff.lat, 
          lng: data.dropoff.lng 
        },
        vehicleType: data.rideType as VehicleType,
        fare: data.price,
      }, token);

      const selectedMethod = PAYMENT_METHODS.find(m => m.id === data.paymentMethodId);
      if (selectedMethod?.type !== "CASH" && selectedMethod?.gateway) {
        localStorage.setItem("pending_ride", "true");
        const paymentRes = await paymentService.initiatePayment({ 
          amount: res.payment.amount,
          email: session?.user?.email || "",
          gateway: selectedMethod.gateway as any,
          method: "CARD",
          type: "RIDE",
          rideId: res.ride.id,
        }, token);
        if (paymentRes.authorizationUrl) window.open(paymentRes.authorizationUrl, "_blank");
        return;
      }
      await RideService.confirmRide(res.ride.id, "CASH", token); 
    } catch (error: any) {
      // ✅ FIX 6: Graceful fallback without wiping UI data on backend rejection
      setRideStage("IDLE");
      const errorMessage = error.response?.data?.message || error.message || "Unable to request ride right now.";
      setErrorState({ title: "Request Failed", message: errorMessage });
    } finally {
      setIsRequestingRide(false);
    }
  };

  const renderSidebar = () => {
    switch (rideStage) {
      case "IDLE":
        return (
          <RideSelector 
            pickupAddress={pickupAddress} 
            destinationAddress={destinationAddress}
            onPickupSelect={(d) => { setPickupAddress(d.address); setUserLocation(d); }}
            onDestinationSelect={(d) => { setDestinationAddress(d.address); setDestLocation(d); }}
            priceEstimates={priceEstimates} 
            isCalculatingPrice={isCalculating}
            onRequestRide={handleRequestRide}
            isRequesting={isRequestingRide} 
            availableRideTypes={AVAILABLE_RIDE_TYPES}
            isGoogleLoaded={isGoogleLoaded}
          />
        );
      case "PROCESSING_PAYMENT":
        return (
          <div className="p-8 text-center h-full flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-emerald-500" size={40} />
            <h3 className="font-bold text-xl">Processing Payment</h3>
            <p className="text-gray-500 text-sm mt-2">Please complete the payment in the browser window.</p>
          </div>
        );
      case "FINDING_DRIVER":
        return <FindingDriverUI onCancel={resetApp} pickupAddress={pickupAddress} dropoffAddress={destinationAddress} />;
      case "ON_WAY":
      case "ARRIVED":
        return (
          <DriverStatusUI 
            status={rideStage as any} 
            driver={activeRide?.rider} 
            tripDetails={{ pickup: pickupAddress, dropoff: destinationAddress }}
            otp={activeRide?.otp} 
            onCancel={resetApp} 
          />
        );
      case "IN_PROGRESS":
        return (
          <TripProgressUI
            destination={destinationAddress}
            driverName={activeRide?.rider?.name || "Driver"}
            etaMinutes={activeRide?.rider?.etaMinutes || 10} 
          />
        );
      case "COMPLETED":
        return (
          <TripCompleteUI
            pickup={pickupAddress}
            dropoff={destinationAddress}
            price={activeRide?.totalFare || priceEstimates?.total || 0}
            driverName={activeRide?.rider?.name || "Your Driver"} 
            onClose={resetApp}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      <div className="relative flex-1">
        <GoogleMapView 
          isLoaded={isGoogleLoaded} 
          userPos={userLocation} 
          destPos={destLocation} 
          rideStage={rideStage === "PROCESSING_PAYMENT" ? "FINDING_DRIVER" : (rideStage as any)} 
          driverPos={driverLocation} 
        />
      </div>
      <div className="w-[450px] bg-white shadow-xl relative z-20">
        {errorState && (
          <div className="absolute inset-0 z-50 bg-white/95 p-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="text-red-500 mb-4" size={48} />
            <h3 className="font-bold text-lg">{errorState.title}</h3>
            <p className="text-gray-600 mb-6">{errorState.message}</p>
            <button onClick={() => setErrorState(null)} className="bg-black text-white px-8 py-2 rounded-lg font-bold">Dismiss</button>
          </div>
        )}
        {renderSidebar()}
      </div>
    </div>
  );
}