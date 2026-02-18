'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RideService } from '@/services/ride.service';
import { mapRideToViewModel, hasValidCoordinates } from '@/services/mappers/ride.mapper';
import type { RideViewModel } from '@/types/ride-view-model';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { ErrorState } from '@/components/ErrorState';
import {
  formatRideStatus,
  formatRideDateTime,
  formatRideTime,
  formatCurrency,
} from '@/services/formatters/ride-status.formatter';
import { 
  ArrowLeft, Clock, MapPin, CreditCard, User, Star, ShieldCheck, 
  Receipt, Navigation, Loader2, AlertCircle
} from 'lucide-react';

export default function RideDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { isLoaded } = useGoogleMaps();

  // ========== STATE ==========
  const [ride, setRide] = useState<RideViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);

  // Keep ref to abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // ========== DATA FETCHING ==========
  /**
   * Fetch ride details and transform via mapper
   * Includes proper error handling and race condition prevention
   */
  useEffect(() => {
    // Get token and ride ID
    const token = session?.accessToken as string | undefined;
    const rideId = params.id as string | undefined;

    // Guard: Ensure we have both token and rideId
    if (!token || !rideId) {
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchRide = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch raw backend ride
        const backendRide = await RideService.getRideById(rideId, token, signal);

        // Transform backend → ViewModel (handles all mapping and null safety)
        const viewModel = mapRideToViewModel(backendRide);
        setRide(viewModel);

        // ========== MAP ROUTE CALCULATION ==========
        // Only calculate if we have valid coordinates and Google Maps is loaded
        if (
          isLoaded &&
          window.google &&
          hasValidCoordinates(viewModel.pickupAddress) &&
          hasValidCoordinates(viewModel.dropoffAddress)
        ) {
          try {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
              {
                origin: {
                  lat: viewModel.pickupAddress.lat!,
                  lng: viewModel.pickupAddress.lng!,
                },
                destination: {
                  lat: viewModel.dropoffAddress.lat!,
                  lng: viewModel.dropoffAddress.lng!,
                },
                travelMode: google.maps.TravelMode.DRIVING,
              },
              (result, status) => {
                // Only update if request is not aborted
                if (!signal.aborted && status === 'OK' && result) {
                  setRoutePolyline(result.routes[0].overview_polyline);
                }
              }
            );
          } catch (mapError) {
            console.warn('[RideDetails] Map route calculation failed:', mapError);
            // Non-fatal: map still works without polyline
          }
        }
      } catch (err) {
        // Don't log abort errors (user navigated away)
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[RideDetails] Failed to fetch ride:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load ride details'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRide();

    // Cleanup: Cancel request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [session?.accessToken, params.id, isLoaded]);

  // ========== RENDER: LOADING STATE ==========
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading ride details...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER: ERROR STATE ==========
  if (error) {
    return (
      <ErrorState
        title="Failed to Load Ride"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // ========== RENDER: NOT FOUND STATE ==========
  if (!ride) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-zinc-400" />
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Ride not found
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              This ride may have been deleted or you don&apos;t have access to it.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ========== RENDER: SUCCESS STATE ==========
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-20 md:pb-0">
      {/* ========== HEADER ========== */}
      <div className="bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Ride Details</h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* ========== DATE & STATUS ========== */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
              {formatRideDateTime(ride.createdAt?.toISOString())}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Order ID: #{ride.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              ride.status === 'COMPLETED'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : ride.status === 'CANCELLED'
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            }`}
          >
            {ride.statusLabel}
          </span>
        </div>

        {/* ========== MAP SNAPSHOT ========== */}
        {isLoaded && hasValidCoordinates(ride.pickupAddress) && hasValidCoordinates(ride.dropoffAddress) && (
          <div className="h-48 w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{
                lat: ride.pickupAddress.lat!,
                lng: ride.pickupAddress.lng!,
              }}
              zoom={12}
              options={{
                disableDefaultUI: true,
                draggable: false,
                zoomControl: false,
                styles: [
                  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                ],
              }}
            >
              <Marker
                position={{
                  lat: ride.pickupAddress.lat!,
                  lng: ride.pickupAddress.lng!,
                }}
              />
              <Marker
                position={{
                  lat: ride.dropoffAddress.lat!,
                  lng: ride.dropoffAddress.lng!,
                }}
              />
              {routePolyline && (
                <Polyline
                  path={google.maps.geometry.encoding.decodePath(routePolyline)}
                  options={{ strokeColor: '#000', strokeWeight: 3 }}
                />
              )}
            </GoogleMap>
            {/* Overlay to prevent interaction */}
            <div className="absolute inset-0 bg-transparent" />
          </div>
        )}

        {/* ========== DRIVER CARD (Safe rendering - check exists) ========== */}
        {ride.driver && (
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
              Driver Details
            </h3>
            <div className="flex items-center gap-4">
              {/* Driver Image */}
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                {ride.driver.image ? (
                  <img
                    src={ride.driver.image}
                    alt={ride.driver.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-zinc-400" />
                )}
              </div>

              {/* Driver Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{ride.driver.name}</p>
                {ride.driver.rating !== null && (
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 text-sm">
                    <Star size={14} fill="currentColor" />
                    <span>{ride.driver.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Vehicle Info */}
              <div className="text-right flex-shrink-0">
                {ride.driver.vehicleModel && (
                  <p className="font-medium text-zinc-900 dark:text-white text-sm">
                    {ride.driver.vehicleModel}
                  </p>
                )}
                {ride.driver.vehicleNumber && (
                  <p className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block mt-1 text-zinc-700 dark:text-zinc-300">
                    {ride.driver.vehicleNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========== ROUTE DETAILS ========== */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="relative pl-8">
            <div className="absolute left-2.5 top-2 bottom-0 w-0.5 bg-zinc-100 dark:bg-zinc-800" />

            {/* Pickup Location */}
            <div className="mb-6 relative">
              <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-black dark:bg-white border-2 border-white dark:border-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700" />
              <p className="text-xs text-zinc-400 mb-1">
                {formatRideTime(ride.createdAt?.toISOString())}
              </p>
              <p className="font-medium text-zinc-900 dark:text-white">
                {ride.pickupAddress.addressText}
              </p>
            </div>

            {/* Dropoff Location */}
            <div className="relative">
              <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-black dark:bg-white border-2 border-white dark:border-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700" />
              <p className="text-xs text-zinc-400 mb-1">
                {ride.completedTime
                  ? formatRideTime(ride.completedTime.toISOString())
                  : '--:--'}
              </p>
              <p className="font-medium text-zinc-900 dark:text-white">
                {ride.dropoffAddress.addressText}
              </p>
            </div>
          </div>
        </div>

        {/* ========== PAYMENT BREAKDOWN ========== */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Receipt size={14} /> Payment Receipt
          </h3>

          <div className="space-y-3 text-sm">
            {/* Ride Fare */}
            <div className="flex justify-between">
              <span className="text-zinc-500">Ride Fare</span>
              <span className="font-medium">{formatCurrency(ride.actualFare)}</span>
            </div>

            {/* Estimated Fare (if different from actual) */}
            {ride.estimatedFare &&
              ride.estimatedFare !== ride.actualFare && (
                <div className="flex justify-between text-zinc-400 text-xs">
                  <span>Estimated</span>
                  <span>{formatCurrency(ride.estimatedFare)}</span>
                </div>
              )}

            {/* Distance */}
            {ride.distanceKm && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Distance</span>
                <span className="font-medium">{ride.distanceKm.toFixed(1)} km</span>
              </div>
            )}

            {/* Duration */}
            {ride.durationMin && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Duration</span>
                <span className="font-medium">{ride.durationMin} min</span>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-bold text-base">Total</span>
              <span className="font-black text-xl">{formatCurrency(ride.actualFare)}</span>
            </div>
          </div>

          {/* Payment Method & Transaction ID */}
          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <CreditCard size={20} className="text-zinc-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                Paid via{' '}
                {ride.paymentStatus === 'PAID' || ride.paymentStatus === 'COMPLETED'
                  ? 'Card'
                  : 'Cash'}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                Transaction ID: {ride.id.slice(0, 12).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* ========== CANCELLATION REASON (if applicable) ========== */}
        {ride.status === 'CANCELLED' && ride.cancellationReason && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
              Cancellation Reason
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {ride.cancellationReason}
            </p>
          </div>
        )}

        {/* ========== REPORT ISSUE BUTTON ========== */}
        <button className="w-full py-4 text-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
          <ShieldCheck size={16} /> Report an issue with this ride
        </button>
      </div>
    </div>
  );
}