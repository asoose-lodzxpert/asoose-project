'use client';

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import { RideService, PriceEstimate } from "@/services/ride.service";
import { buildCreateRidePayload } from "@/services/build-create-ride-payload";
import { validateCreateRidePayload } from "@/services/validate-create-ride-payload";
import { normalizeApiError } from "@/services/normalize-api-error";
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";
import { useDebounce } from "../hooks/useDebounce";
import { SidebarSection, SidebarDivider } from "./Sidebar";
import { PrimaryButton, SecondaryButton, Text, DangerButton } from "@/components/ui";
import { X, RotateCcw } from "lucide-react";

export function RideSelection() {
  const { data: session } = useSession();
  
  // --- Store Selectors ---
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setRideType = useRideStore((state) => state.setRideType);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);
  const setRideId = useRideStore((state) => state.setRideId);
  const clearPickupLocation = useRideStore((state) => state.clearPickupLocation);
  const clearDropoffLocation = useRideStore((state) => state.clearDropoffLocation);
  const clearAllLocations = useRideStore((state) => state.clearAllLocations);

  // --- Global Address Setters ---
  const setPickupAddressStore = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddressStore = useRideStore((state) => state.setDropoffAddress);
  
  // New Selectors for Map Control
  const mapInstance = useRideStore((state) => state.mapInstance);
  const isGoogleMapsLoaded = useRideStore((state) => state.isGoogleMapsLoaded);
  const setRoutePolyline = useRideStore((state) => state.setRoutePolyline);

  // --- Address State from Zustand ---
  const pickupAddress = useRideStore((state) => state.pickupAddress || '');
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress || '');
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [estimates, setEstimates] = useState<Record<string, PriceEstimate> | null>(null);

  // --- AbortControllers for Request Cancellation ---
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  const estimateAbortControllerRef = useRef<AbortController | null>(null);

  const debouncedPickup = useDebounce(pickupLocation, 500);
  const debouncedDropoff = useDebounce(dropoffLocation, 500);

  // --- 1. Effect: Calculate Route Visuals (The Blue Line) ---
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapInstance || !debouncedPickup || !debouncedDropoff) return;

    const calculateRoute = async () => {
      const directionsService = new google.maps.DirectionsService();

      try {
        const result = await directionsService.route({
          origin: debouncedPickup,
          destination: debouncedDropoff,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (result.routes[0]?.overview_polyline) {
          setRoutePolyline(result.routes[0].overview_polyline);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(debouncedPickup);
          bounds.extend(debouncedDropoff);
          mapInstance.fitBounds(bounds, {
             top: 50, right: 50, bottom: 250, left: 50
          });
        }
      } catch (error) {
        console.error("Directions request failed", error);
      }
    };

    calculateRoute();
  }, [debouncedPickup, debouncedDropoff, isGoogleMapsLoaded, mapInstance, setRoutePolyline]);

  // --- 2. Effect: Fetch Backend Prices ---
  useEffect(() => {
    async function fetchEstimates() {
      if (!debouncedPickup || !debouncedDropoff || !session?.accessToken) return;

      estimateAbortControllerRef.current?.abort();
      
      const controller = new AbortController();
      estimateAbortControllerRef.current = controller;

      setIsCalculating(true);
      try {
        const estimatePayload = {
          pickupLat: debouncedPickup.lat,
          pickupLng: debouncedPickup.lng,
          dropoffLat: debouncedDropoff.lat,
          dropoffLng: debouncedDropoff.lng,
        };
        
        // Dynamic import validation check
        try {
          const { validateFareEstimatePayload: importedValidateFareEstimatePayload } = await import('@/services/validate-fare-estimate-payload');
          const validateFareEstimatePayload: (payload: unknown) => asserts payload is any = importedValidateFareEstimatePayload;
          validateFareEstimatePayload(estimatePayload);
        } catch (validationError) {
          toast.error(validationError instanceof Error ? validationError.message : 'Invalid fare estimate payload');
          setIsCalculating(false);
          return;
        }

        const data = await RideService.getEstimate(
          estimatePayload,
          session.accessToken,
          controller.signal
        );
        
        if (!controller.signal.aborted) {
          setEstimates(data);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to get estimates:", error);
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculating(false);
        }
      }
    }

    fetchEstimates();

    return () => {
      estimateAbortControllerRef.current?.abort();
    };
  }, [debouncedPickup, debouncedDropoff, session?.accessToken]);


  // --- Payment Method State ---
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

  // --- Booking Handler ---
  const handleRideRequest = async (rideType: 'economy' | 'business') => {
    if (!pickupLocation || !dropoffLocation) {
      toast.error("Please select both pickup and dropoff locations");
      return;
    }
    if (!session?.accessToken) {
      toast.error("You must be logged in to book a ride");
      return;
    }

    setIsSubmitting(true);
    setRideStatus('searching');
    setRideType(rideType);

    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = buildCreateRidePayload({
        pickupLocation: {
          addressText: pickupAddress || "Pinned Location",
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
        },
        dropoffLocation: {
          addressText: dropoffAddress || "Pinned Location",
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
        },
        vehicleType: rideType.toUpperCase(),
      });
      try {
        validateCreateRidePayload(payload);
      } catch (validationError) {
        toast.error(validationError instanceof Error ? validationError.message : 'Invalid booking payload');
        setIsSubmitting(false);
        setRideStatus('idle');
        return;
      }
      const response = await RideService.createRide(
        payload,
        session.accessToken,
        idempotencyKey
      );
      if (setRideId) setRideId(response.ride.id);
    } catch (error: any) {
      const norm = normalizeApiError(error);
      console.error("Booking failed:", norm);
      toast.error(norm.message || "Failed to request ride.");
      setRideStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const formatDuration = (seconds: number) => Math.ceil(seconds / 60) + ' min';

  // --- 3. Clear Location Handlers ---
  const handleClearPickup = () => {
    routeAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current?.abort();
    clearPickupLocation();
    setPickupAddress('');
    setEstimates(null);
    toast.info("Pickup location cleared");
  };

  const handleClearDropoff = () => {
    routeAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current?.abort();
    clearDropoffLocation();
    setDropoffAddress('');
    setEstimates(null);
    toast.info("Dropoff location cleared");
  };

  return (
    <>
      {/* Pickup Location */}
      <SidebarSection title="From">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LocationAutocompleteInput
              type="pickup"
              onLocationSelect={(loc, address) => {
                setPickupLocation(loc);
                setPickupAddress(address);
                setPickupAddressStore(address);
              }}
              initialValue={pickupLocation ? (pickupAddress || 'Current Pickup') : ''}
            />
          </div>
          {pickupLocation && (
            <button
              onClick={handleClearPickup}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
              title="Clear pickup location"
              aria-label="Clear pickup location"
            >
              <X size={18} className="text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </SidebarSection>

      <SidebarDivider />

      {/* Dropoff Location */}
      <SidebarSection title="To">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LocationAutocompleteInput
              type="dropoff"
              onLocationSelect={(loc, address) => {
                setDropoffLocation(loc);
                setDropoffAddress(address);
                setDropoffAddressStore(address);
              }}
              initialValue={dropoffLocation ? (dropoffAddress || 'Current Dropoff') : ''}
            />
          </div>
          {dropoffLocation && (
            <button
              onClick={handleClearDropoff}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
              title="Clear dropoff location"
              aria-label="Clear dropoff location"
            >
              <X size={18} className="text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </SidebarSection>

      {/* Fare Estimates & Ride Selection - Only show if both locations selected */}
      {pickupLocation && dropoffLocation && estimates && (
        <>
          <SidebarDivider />
          <SidebarSection title="Select Ride">
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Economy Button */}
              <SecondaryButton 
                onClick={() => handleRideRequest('economy')} 
                disabled={isSubmitting || isCalculating}
                className="h-20 flex flex-col items-center justify-center"
              >
                {isCalculating ? (
                  <Text size="xs" variant="secondary">Calculating...</Text>
                ) : (
                  <>
                    <Text size="sm" weight="semibold">Economy</Text>
                    {estimates?.['ECONOMY'] && (
                      <Text size="xs" variant="secondary" className="mt-1">
                        {formatDuration(estimates['ECONOMY'].duration)} • {formatMoney(estimates['ECONOMY'].estimatedFare)}
                      </Text>
                    )}
                  </>
                )}
              </SecondaryButton>

              {/* Business Button */}
              <PrimaryButton 
                onClick={() => handleRideRequest('business')} 
                disabled={isSubmitting || isCalculating}
                className="h-20 flex flex-col items-center justify-center"
              >
                {isCalculating ? (
                  <Text size="xs" className="text-white">Calculating...</Text>
                ) : (
                  <>
                    <Text size="sm" weight="semibold" className="text-white">Business</Text>
                    {estimates?.['BUSINESS'] && (
                      <Text size="xs" className="mt-1 text-white/80">
                        {formatDuration(estimates['BUSINESS'].duration)} • {formatMoney(estimates['BUSINESS'].estimatedFare)}
                      </Text>
                    )}
                  </>
                )}
              </PrimaryButton>
            </div>
          </SidebarSection>
        </>
      )}
    </>
  );
}