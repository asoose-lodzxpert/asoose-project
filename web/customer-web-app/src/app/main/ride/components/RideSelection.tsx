'use client';

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import { RideService, PriceEstimate } from "@/services/ride.service";
import { buildCreateRidePayload } from "@/services/build-create-ride-payload";
import { validateCreateRidePayload } from "@/services/validate-create-ride-payload";
import { normalizeApiError } from "@/services/normalize-api-error";
import { validateFareEstimatePayload } from "@/services/validate-fare-estimate-payload";
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";
import { useDebounce } from "../hooks/useDebounce";
import { SidebarSection, SidebarDivider } from "./Sidebar";
import { PrimaryButton, SecondaryButton, Text, DangerButton } from "@/components/ui";
import { X, RotateCcw, Banknote, CreditCard } from "lucide-react";
import { paymentService } from "@/services/payment.service";

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
  const [estimateError, setEstimateError] = useState<string | null>(null);
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
      setEstimateError(null);
      try {
        const estimatePayload = {
          pickupLat: debouncedPickup.lat,
          pickupLng: debouncedPickup.lng,
          dropoffLat: debouncedDropoff.lat,
          dropoffLng: debouncedDropoff.lng,
        };
        
        try {
          validateFareEstimatePayload(estimatePayload);
        } catch (validationError) {
          const msg = validationError instanceof Error ? validationError.message : 'Invalid fare estimate payload';
          setEstimateError(msg);
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
          setEstimateError(null);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to get estimates:", error);
        if (!controller.signal.aborted) {
          const msg = error?.type === 'network-error'
            ? 'Cannot reach server. Is the backend running? Tap to retry.'
            : error?.type === 'timeout'
            ? 'Request timed out. Tap to retry.'
            : error?.message || 'Failed to load ride prices. Tap to retry.';
          setEstimateError(msg);
        }
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
      // Get the selected estimate for fare/distance/duration
      const vehicleKey = rideType.toUpperCase();
      const selectedEstimate = estimates?.[vehicleKey];
      if (!selectedEstimate) {
        toast.error("Fare estimate not available. Please wait for calculation.");
        setIsSubmitting(false);
        setRideStatus('idle');
        return;
      }

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
        vehicleType: vehicleKey,
        fare: selectedEstimate.estimatedFare,
        distanceKm: selectedEstimate.distance,
        durationMin: selectedEstimate.duration,
      });
      try {
        validateCreateRidePayload(payload);
      } catch (validationError) {
        toast.error(validationError instanceof Error ? validationError.message : 'Invalid booking payload');
        setIsSubmitting(false);
        setRideStatus('idle');
        return;
      }

      // 1. Create ride (PENDING ride + PENDING payment)
      const response = await RideService.createRide(
        payload,
        session.accessToken,
        idempotencyKey
      );
      if (setRideId) setRideId(response.ride.id);

      // 2. Confirm ride with chosen payment method
      const confirmResult = await RideService.confirmRide(
        response.ride.id,
        paymentMethod,
        session.accessToken
      );

      // 3. CARD → initiate Paystack payment and redirect
      if (paymentMethod === 'CARD' && confirmResult?.status === 'AWAITING_PAYMENT') {
        try {
          const email = (session.user as any)?.email || '';
          const paymentRes = await paymentService.initiatePayment(
            {
              amount: selectedEstimate.estimatedFare,
              email,
              gateway: 'PAYSTACK',
              method: 'CARD',
              type: 'RIDE',
              rideId: response.ride.id,
            },
            session.accessToken,
          );

          // Save ride context for when user returns from Paystack
          localStorage.setItem('pending_ride', 'true');
          localStorage.setItem('pending_ride_id', response.ride.id);

          // Redirect to Paystack hosted checkout
          window.location.href = paymentRes.authorizationUrl;
          return; // Don't reset submitting — user is navigating away
        } catch (payErr: any) {
          console.error('Paystack init failed:', payErr);
          toast.error(payErr?.message || 'Failed to initialize payment. Please try again.');
          setRideStatus('idle');
          return;
        }
      }

      // CASH flow — ride is now REQUESTED, driver matching in progress
    } catch (error: any) {
      const norm = normalizeApiError(error);
      console.error("Booking failed:", JSON.stringify(norm, null, 2));

      // Surface specific, user-friendly messages based on error type
      const userMessage =
        error?.type === 'network-error'
          ? 'Cannot reach the server. Please check your connection and try again.'
          : error?.type === 'timeout'
          ? 'The request timed out. Please try again.'
          : norm.message || 'Failed to request ride. Please try again.';

      toast.error(userMessage);
      setRideStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const formatDuration = (minutes: number) => Math.ceil(minutes) + ' min';

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

      {/* Fare Estimates & Ride Selection - Show once both locations are set */}
      {pickupLocation && dropoffLocation && (
        <>
          <SidebarDivider />

          {/* Loading state */}
          {isCalculating && !estimates && (
            <SidebarSection title="Select Ride">
              <div className="flex items-center justify-center h-20 text-zinc-500 dark:text-zinc-400">
                <RotateCcw size={18} className="animate-spin mr-2" />
                <Text size="sm" variant="secondary">Calculating fares...</Text>
              </div>
            </SidebarSection>
          )}

          {/* Error state with retry */}
          {estimateError && !isCalculating && (
            <SidebarSection title="Select Ride">
              <button
                onClick={() => {
                  setEstimateError(null);
                  setEstimates(null);
                  // Trigger re-fetch by clearing and resetting the estimate abort controller
                  estimateAbortControllerRef.current?.abort();
                  const controller = new AbortController();
                  estimateAbortControllerRef.current = controller;
                  if (debouncedPickup && debouncedDropoff && session?.accessToken) {
                    setIsCalculating(true);
                    RideService.getEstimate(
                      { pickupLat: debouncedPickup.lat, pickupLng: debouncedPickup.lng, dropoffLat: debouncedDropoff.lat, dropoffLng: debouncedDropoff.lng },
                      session.accessToken,
                      controller.signal
                    ).then((data) => {
                      if (!controller.signal.aborted) {
                        setEstimates(data);
                        setEstimateError(null);
                      }
                    }).catch((err) => {
                      if (err.name !== 'AbortError' && !controller.signal.aborted) {
                        const msg = err?.type === 'network-error'
                          ? 'Cannot reach server. Is the backend running? Tap to retry.'
                          : err?.type === 'timeout'
                          ? 'Request timed out. Tap to retry.'
                          : err?.message || 'Failed to load ride prices. Tap to retry.';
                        setEstimateError(msg);
                      }
                    }).finally(() => {
                      if (!controller.signal.aborted) setIsCalculating(false);
                    });
                  }
                }}
                className="flex items-center justify-center h-20 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <Text size="sm" className="text-red-600 dark:text-red-400">{estimateError}</Text>
              </button>
            </SidebarSection>
          )}

          {/* Estimates loaded — show payment method & ride types */}
          {estimates && (
            <>
              {/* Payment Method Selector */}
              <SidebarSection title="Payment">
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 ring-1 ring-yellow-500'
                        : 'border-gray-200 dark:border-white/10 hover:border-yellow-500/50'
                    }`}
                  >
                    <Banknote size={18} className={paymentMethod === 'CASH' ? 'text-yellow-600' : 'text-gray-500 dark:text-gray-400'} />
                    <Text size="sm" weight={paymentMethod === 'CASH' ? 'semibold' : 'normal'}>Cash</Text>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 ring-1 ring-yellow-500'
                        : 'border-gray-200 dark:border-white/10 hover:border-yellow-500/50'
                    }`}
                  >
                    <CreditCard size={18} className={paymentMethod === 'CARD' ? 'text-yellow-600' : 'text-gray-500 dark:text-gray-400'} />
                    <Text size="sm" weight={paymentMethod === 'CARD' ? 'semibold' : 'normal'}>Card</Text>
                  </button>
                </div>
              </SidebarSection>

              <SidebarDivider />

              {/* Ride Type Selection */}
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
      )}
    </>
  );
}