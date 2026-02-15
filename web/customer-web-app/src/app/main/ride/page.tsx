"use client";

import React, { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from 'uuid';

import { RideService } from "@/services/ride.service";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { useRideSocket } from "@/hooks/useRideSocket";
import { paymentService } from "@/services/payment.service";
import { useRideStore } from "@/store/useRideStore";
import { useRideFlow } from "./hooks/useRideFlow";
import { useRideEstimates } from "./hooks/useRideEstimates";
import { TrackingMapHandle } from "@/components/shared/TrackingMap"; 

// Components
import GoogleMapView from "./components/MapView"; 
import RideSelector from "./components/RideSelector";
import DriverStatusUI from "./components/DriverStatus";
import TripProgressUI from "./components/TripProgressUI";
import TripCompleteUI from "./components/TripCompleteUi";
import FindingDriverUI from "./components/findingDriverui";

// Default Center (Lagos) used ONLY for initial view, never as a fake user location
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };

export default function RidePage() {
  const { data: session, status: sessionStatus } = useSession();
  
  const { isLoaded: isGoogleLoaded, loadError } = useGoogleMaps();
  
  const token = useMemo(() => session?.accessToken || (session as any)?.user?.accessToken || null, [session]);

  const { rideStage, activeRide } = useRideStore();
  const { syncRideState, cancelRide } = useRideFlow(token);

  const trackingMapRef = useRef<TrackingMapHandle>(null);

  const [pickup, setPickup] = useState<any>(null);
  const [dropoff, setDropoff] = useState<any>(null);
  const [isRequestingRide, setIsRequestingRide] = useState(false);
  const [availableRideTypes, setAvailableRideTypes] = useState<any[]>([]);

  const { estimates: priceEstimates, loading: isCalculating } = useRideEstimates(pickup, dropoff, token);

  const idempotencyKeyRef = useRef<string>("");

  useEffect(() => {
    if (!idempotencyKeyRef.current && rideStage === "IDLE") {
      idempotencyKeyRef.current = uuidv4();
    }
  }, [rideStage]);

  useEffect(() => {
    if (!token) return;
    const abortController = new AbortController();
    RideService.getVehicleTypes(token, abortController.signal)
      .then((types) => {
        setAvailableRideTypes(types.map(t => ({
          id: t, 
          displayName: t === "BUSINESS" ? "Business Class" : "Economy",
          icon: t === "BUSINESS" ? "/premium-car.svg" : "/standard-car.svg"
        })));
      })
      .catch(err => { if (err.name !== "AbortError") console.error("Failed to load vehicle types", err); });
    return () => abortController.abort();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    syncRideState(); 
  }, [token, syncRideState]);

  const handleSocketEvent = useCallback((event: any) => {
    if (!event?.type) return;
    
    switch (event.type) {
      case "DRIVER_LOCATION_UPDATE":
        if (event.metadata?.lat && event.metadata?.lng) {
          trackingMapRef.current?.updateDriverCoordinates(
            event.metadata.lat,
            event.metadata.lng,
            event.metadata.heading
          );
        }
        break;
      case "DRIVER_FOUND":
      case "TRIP_STARTED":
      case "TRIP_COMPLETED":
        syncRideState(); 
        break;
      case "RIDE_CANCELLED":
        toast.error("Ride was cancelled by the system.");
        syncRideState();
        break;
    }
  }, [syncRideState]);

  useRideSocket(token, handleSocketEvent, syncRideState);

  const handleRequestRide = async (data: { vehicleType: string, paymentMethodId: string }) => {
    if (!token) {
      toast.error("You must be logged in to request a ride.");
      return;
    }

    // FIX: Strict validation to prevent backend 400s or map crashes
    // We require lat/lng to be present even if placeId exists.
    const isPickupValid = pickup && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng);
    const isDropoffValid = dropoff && Number.isFinite(dropoff.lat) && Number.isFinite(dropoff.lng);

    if (!isPickupValid) {
      toast.error("Invalid pickup location. Please select a location with valid coordinates.");
      return;
    }

    if (!isDropoffValid) {
      toast.error("Invalid destination. Please select a location with valid coordinates.");
      return;
    }

    if (isRequestingRide) return; 
    
    setIsRequestingRide(true);
    
    try {
      // Construct payload with guaranteed coordinates
      const payload = {
        pickupLocation: {
            lat: pickup.lat,
            lng: pickup.lng,
            address: pickup.addressText,
            placeId: pickup.placeId || undefined // Optional
        },
        dropoffLocation: {
            lat: dropoff.lat,
            lng: dropoff.lng,
            address: dropoff.addressText,
            placeId: dropoff.placeId || undefined // Optional
        },
        vehicleType: data.vehicleType,
        paymentMethodId: data.paymentMethodId,
      };

      const res = await RideService.createRide(payload, token, idempotencyKeyRef.current);
      
      if (data.paymentMethodId !== "CASH" && res.payment?.gateway) {
        const paymentRes = await paymentService.initiatePayment({ 
          amount: res.fare,
          email: session?.user?.email || "user@example.com",
          gateway: res.payment.gateway as any,
          method: "CARD", 
          type: "RIDE", 
          rideId: res.ride.id,
        }, token);
        
        if (paymentRes.authorizationUrl) {
          window.location.href = paymentRes.authorizationUrl; 
          return; 
        }
      }
      
      await RideService.confirmRide(res.ride.id, "CASH", token); 
      syncRideState();
      idempotencyKeyRef.current = "";

    } catch (error: any) {
      console.error("Ride Request Error:", error);
      toast.error(error.message || "Failed to request ride. Please check your connection.");
      if (error.status === 400 || error.statusCode === 400) {
        idempotencyKeyRef.current = uuidv4();
      }
    } finally {
      setIsRequestingRide(false);
    }
  };

  if (sessionStatus === "loading") return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  if (loadError) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4 bg-gray-50 text-red-600">
        <AlertTriangle size={48} />
        <div className="text-center">
          <h2 className="text-xl font-bold">Map Service Unavailable</h2>
          <p className="text-sm text-gray-600 mt-2">Configuration Error: {loadError.message}</p>
          <p className="text-xs text-gray-400 mt-1">Please check your Google Maps API Key and Billing Status.</p>
        </div>
      </div>
    );
  }

  // FIX: User Position Logic
  // 1. If active ride exists, show pickup.
  // 2. If user selected a pickup, show it.
  // 3. DO NOT fallback to DEFAULT_CENTER here. If null, map shows default view but no user pin.
  const mapUserPos = activeRide?.pickupAddress 
    ? { lat: activeRide.pickupAddress.lat || 0, lng: activeRide.pickupAddress.lng || 0 } 
    : (pickup?.lat && pickup?.lng ? { lat: pickup.lat, lng: pickup.lng } : null);

  const mapDestPos = activeRide?.dropoffAddress 
    ? { lat: activeRide.dropoffAddress.lat || 0, lng: activeRide.dropoffAddress.lng || 0 } 
    : (dropoff?.lat && dropoff?.lng ? { lat: dropoff.lat, lng: dropoff.lng } : null);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      <div className="relative flex-1">
        {/* NOTE: Ensure your MapView component handles 'userPos' being null gracefully 
           (e.g., by not rendering the marker but keeping the map rendered).
           We pass 'defaultCenter' to set the initial viewport if userPos is null.
        */}
        <GoogleMapView 
          ref={trackingMapRef} 
          isLoaded={isGoogleLoaded} 
          userPos={mapUserPos} // Can now be null
          destPos={mapDestPos} 
          rideStage={rideStage} 
          driverPos={activeRide?.driver?.location || undefined}
          // @ts-ignore - Assuming MapView will be updated to accept this or ignores it
          defaultCenter={DEFAULT_CENTER} 
        />
      </div>
      <div className="w-[450px] bg-white shadow-xl relative z-20">
        
        {rideStage === "IDLE" && (
          <RideSelector 
            pickupAddress={pickup?.addressText || ""}
            destinationAddress={dropoff?.addressText || ""}
            onPickupSelect={(d) => setPickup({ addressText: d.address, placeId: d.placeId, lat: d.lat, lng: d.lng })}
            onDestinationSelect={(d) => setDropoff({ addressText: d.address, placeId: d.placeId, lat: d.lat, lng: d.lng })}
            onRequestRide={handleRequestRide}
            isGoogleLoaded={isGoogleLoaded}
            priceEstimates={priceEstimates}
            isCalculatingPrice={isCalculating}
            isRequesting={isRequestingRide}
            availableRideTypes={availableRideTypes}
          />
        )}
        
        {rideStage === "PROCESSING_PAYMENT" && (
           <div className="p-8 text-center h-full flex flex-col items-center justify-center">
             <Loader2 className="animate-spin mx-auto mb-4 text-emerald-500" size={40} />
             <h3 className="font-bold text-xl">Awaiting Payment Confirmation</h3>
             <p className="text-gray-500 mt-2">Please complete payment in the gateway...</p>
           </div>
        )}
        
        {rideStage === "FINDING_DRIVER" && (
          <FindingDriverUI 
            onCancel={cancelRide} 
            pickupAddress={activeRide?.pickupAddress?.addressText || pickup?.addressText || ""}
            dropoffAddress={activeRide?.dropoffAddress?.addressText || dropoff?.addressText || ""}
          />
        )}
        
        {(rideStage === "ON_WAY" || rideStage === "ARRIVED") && (
          <DriverStatusUI status={rideStage} driver={activeRide?.driver} onCancel={cancelRide} tripDetails={{
            pickup: activeRide?.pickupAddress?.addressText || "",
            dropoff: activeRide?.dropoffAddress?.addressText || "",
            price: activeRide?.actualFare || activeRide?.totalFare || 0
          }} />
        )}
        
        {rideStage === "IN_PROGRESS" && (
          <TripProgressUI 
            driverName={activeRide?.driver?.name || "Driver"} 
            destination={activeRide?.dropoffAddress?.addressText || ""}
            etaMinutes={activeRide?.driver?.etaMinutes || 10}
          />
        )}
        
        {rideStage === "COMPLETED" && (
          <TripCompleteUI 
            price={activeRide?.actualFare || activeRide?.totalFare || 0} 
            driverName={activeRide?.driver?.name || "Driver"}
            pickup={activeRide?.pickupAddress?.addressText || ""}
            dropoff={activeRide?.dropoffAddress?.addressText || ""}
            onClose={() => useRideStore.getState().reset()} 
          />
        )}
      </div>
    </div>
  );
}