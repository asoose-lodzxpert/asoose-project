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

// Component Imports
import GoogleMapView from "./components/map";
import RideSelector, { RideRequestPayload, AVAILABLE_RIDE_TYPES } from "./components/RideSelector";
import DriverStatusUI from "./components/DriverStatus";
import TripProgressUI from "./components/TripProgressUI";
import TripCompleteUI from "./components/TripCompleteUi";
import FindingDriverUI from "./components/findingDriverui";

export default function RidePage() {
  const { data: session } = useSession();
  const { isLoaded: isGoogleLoaded } = useGoogleMaps();
  const token = session?.accessToken || (session as any)?.user?.accessToken || null;

  // --- State Management ---
  const [rideStage, setRideStage] = useState<string>("IDLE");
  const [activeRide, setActiveRide] = useState<any>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>("CAR");
  const [priceEstimates, setPriceEstimates] = useState<PriceEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRequestingRide, setIsRequestingRide] = useState(false); // Resolved: Missing isRequesting prop
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

  // Locations
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [destLocation, setDestLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [driverLocation, setDriverLocation] = useState<any>(undefined);

  // --- Actions ---

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
        setRideStage(mapStatusToView(ride.status)); //
        if (ride.pickupAddress) setPickupAddress(ride.pickupAddress.address);
        if (ride.dropoffAddress) setDestinationAddress(ride.dropoffAddress.address);
      } else if (rideStage !== "IDLE" && rideStage !== "COMPLETED") {
        resetApp();
      }
    } catch (err) {
      console.error("Failed to sync ride state", err);
    }
  }, [token, rideStage, resetApp]);

  // --- Effects ---

  // Initial Sync & Polling for Payment/Matching Recovery
  useEffect(() => {
    syncRideState();
    if (rideStage === "PROCESSING_PAYMENT" || localStorage.getItem("pending_ride")) {
      const interval = setInterval(syncRideState, 3000);
      return () => clearInterval(interval);
    }
  }, [token, rideStage, syncRideState]);

  // Price Estimation Logic - Extracts specific type from backend dictionary
  useEffect(() => {
    if (!userLocation || !destLocation || !token) return;
    setIsCalculating(true);
    RideService.getEstimate({
      pickupLat: userLocation.lat,
      pickupLng: userLocation.lng,
      dropoffLat: destLocation.lat,
      dropoffLng: destLocation.lng,
      vehicleType: selectedVehicleType,
    }, token)
    .then((data: any) => {
      // Backend returns Record<VehicleType, PriceEstimate>
      setPriceEstimates(data[selectedVehicleType] || null);
    })
    .finally(() => setIsCalculating(false));
  }, [userLocation, destLocation, selectedVehicleType, token]);

  // Socket Handler
  const handleSocketEvent = useCallback((event: any) => {
    switch (event.type) {
      case "DRIVER_FOUND":
        setRideStage("ON_WAY");
        syncRideState();
        break;
      case "DRIVER_LOCATION_UPDATE":
        setDriverLocation({ 
          lat: event.metadata.lat, 
          lng: event.metadata.lng, 
          heading: event.metadata.heading 
        });
        break;
      case "TRIP_STARTED":
        setRideStage("IN_PROGRESS");
        break;
      case "TRIP_COMPLETED":
        setRideStage("COMPLETED");
        break;
      case "RIDE_CANCELLED":
        resetApp();
        setErrorState({ title: "Cancelled", message: "The ride was cancelled." });
        break;
    }
  }, [syncRideState, resetApp]);

  useRideSocket(token, handleSocketEvent, syncRideState); //

  // Request Ride Logic
  const handleRequestRide = async (data: RideRequestPayload) => {
    if (!token || !priceEstimates) return;
    setIsRequestingRide(true);
    setRideStage("FINDING_DRIVER");
    
    try {
      const res = await RideService.createRide({
        pickupLocation: { latitude: data.pickup.lat, longitude: data.pickup.lng, address: data.pickup.address },
        dropoffLocation: { latitude: data.dropoff.lat, longitude: data.dropoff.lng, address: data.dropoff.address },
        vehicleType: data.rideType as VehicleType, // Resolved: Type assertion for strict enum
        fare: priceEstimates.total, // Resolved: Passed fare number required by backend
      }, token);

      const selectedMethod = PAYMENT_METHODS.find(m => m.id === data.paymentMethodId);
      if (selectedMethod?.type !== "CASH" && selectedMethod?.gateway) {
        localStorage.setItem("pending_ride", "true");
        const paymentRes = await paymentService.initiatePayment({ //
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
      await RideService.confirmRide(res.ride.id, "CASH", token); //
    } catch (error: any) {
      resetApp();
      setErrorState({ title: "Request Failed", message: error.message || "Unable to request ride." });
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
            onPickupSelect={(d) => { setPickupAddress(d.address); setUserLocation({ lat: d.lat, lng: d.lng }); }}
            onDestinationSelect={(d) => { setDestinationAddress(d.address); setDestLocation({ lat: d.lat, lng: d.lng }); }}
            priceEstimates={priceEstimates} 
            isCalculatingPrice={isCalculating}
            onRequestRide={handleRequestRide}
            isRequesting={isRequestingRide} // Resolved: Missing required prop
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
            tripDetails={{ pickup: pickupAddress, dropoff: destinationAddress }} // Resolved: Missing required prop
            otp={activeRide?.otp} 
            onCancel={resetApp} 
          />
        );
      case "IN_PROGRESS":
        return (
          <TripProgressUI
            destination={destinationAddress}
            driverName={activeRide?.rider?.name || "Driver"}
            etaMinutes={activeRide?.rider?.etaMinutes || 10} // Resolved: Missing required prop
          />
        );
      case "COMPLETED":
        return (
          <TripCompleteUI
            pickup={pickupAddress}
            dropoff={destinationAddress}
            price={activeRide?.totalFare || priceEstimates?.total || 0} // Resolved: Extraction of numeric value
            driverName={activeRide?.rider?.name || "Your Driver"} // Resolved: Missing required prop
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