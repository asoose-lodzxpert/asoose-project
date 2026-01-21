'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Crosshair, AlertTriangle } from 'lucide-react';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';

import GoogleMapView from './components/map';
import RideSelector from './components/RideSelector';
import DriverStatusUI from './components/DriverStatus';
import TripProgressUI from './components/TripProgressUI';
import TripCompleteUI from './components/TripCompleteUi';
import { DriverStatusSkeleton } from './components/Skeleton';
import { 
  getRideEstimate, requestRide, cancelRide, getRideTypes, getCurrentRide,
  RideRequestPayload, PriceEstimate, RideType, Driver
} from '@/services/ride.service';
import { useRideSocket } from '@/hooks/useRideSocket';
import { paymentService } from '@/services/payment.service';
import { createClient } from '../../../../utils/supabase/client';
import { PAYMENT_METHODS } from './constants/config';

const GOOGLE_LIBS: Libraries = ['places'];

type PageView = 'IDLE' | 'FINDING_DRIVER' | 'ON_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>}>
      <HomeContent />
    </Suspense>
  );  
}

function HomeContent() {

  const supabase = createClient();
  const router = useRouter();
  
  const { isLoaded: isGoogleLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: GOOGLE_LIBS,
  });

  // --- State ---
  const [rideStage, setRideStage] = useState<PageView>('IDLE');
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{title: string, message: string} | null>(null);
  const [rideTypes, setRideTypes] = useState<RideType[]>([]); // Dynamic config

  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [destLocation, setDestLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  
  const [priceEstimates, setPriceEstimates] = useState<PriceEstimate | null>(null);
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<google.maps.LatLngLiteral | undefined>(undefined);
  const [isCalculating, setIsCalculating] = useState(false);

  // Request Cancellation Ref
  const estimateAbortController = useRef<AbortController | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // 1. Fetch Config
    getRideTypes().then(setRideTypes).catch(console.error);
    
    // 2. Sync Active Ride (if user refreshes page)
    getCurrentRide().then(ride => {
      if (ride) {
        setActiveRideId(ride.rideId);
        setRideStage(ride.status as PageView);
        // Note: Real app would need to fetch driver details here too
      }
    }).catch(() => {}); // Ignore 404
  }, []);

  // --- Socket Logic ---
  const handleSocketEvent = useCallback((event: any) => {
    console.log('Socket Event:', event.type, event);
    switch (event.type) {
      case 'DRIVER_FOUND':
        setRideStage('ON_WAY');
        setDriverInfo(event.metadata.driver);
        setActiveRideId(event.metadata.rideId);
        break;
      case 'DRIVER_LOCATION_UPDATE':
        if (event.metadata?.lat && event.metadata?.lng) {
          setDriverLocation({ lat: event.metadata.lat, lng: event.metadata.lng });
        }
        break;
      case 'DRIVER_ARRIVED':
        setRideStage('ARRIVED');
        break;
      case 'TRIP_STARTED':
        setRideStage('IN_PROGRESS');
        break;
      case 'TRIP_COMPLETED':
        setRideStage('COMPLETED');
        break;
      case 'NO_DRIVERS_FOUND':
        setRideStage('IDLE');
        setErrorState({
            title: "Busy Area",
            message: "All drivers are currently busy. Please try again in a few moments."
        });
        break;
      case 'RIDE_CANCELLED':
        resetApp();
        setErrorState({ title: "Ride Cancelled", message: "The ride was cancelled." });
        break;
    }
  }, []);



  const handleReconnected = useCallback(() => {
    // Re-sync state on socket reconnection
    getCurrentRide().then(ride => {
      if (!ride && rideStage !== 'IDLE' && rideStage !== 'COMPLETED') {
        // If backend says no ride, but frontend thinks there is one -> Reset
        resetApp();
      }
    });
  }, [rideStage]);

  useRideSocket(handleSocketEvent, handleReconnected);

  // --- Location & Estimates ---
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation || !isGoogleLoaded) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        if (!pickupAddress) {
            const geocoder = new google.maps.Geocoder();
            const res = await geocoder.geocode({ location: coords });
            if (res.results[0]) setPickupAddress(res.results[0].formatted_address);
        }
      },
      (err) => console.error(err)
    );
  }, [isGoogleLoaded, pickupAddress]);

  // Initial Location
  useEffect(() => {
    if (isGoogleLoaded && !userLocation) handleLocateMe();
  }, [isGoogleLoaded, userLocation, handleLocateMe]);

  // Calculate Estimates with Debounce & Abort
  useEffect(() => {
    if (userLocation && destLocation) {
      // Cancel previous request
      if (estimateAbortController.current) {
        estimateAbortController.current.abort();
      }

      // Create new controller
      estimateAbortController.current = new AbortController();
      setIsCalculating(true);

      getRideEstimate(
        { ...userLocation, address: pickupAddress }, 
        { ...destLocation, address: destinationAddress },
        estimateAbortController.current.signal
      )
        .then(data => setPriceEstimates(data))
        .catch(err => {
          if (err.name !== 'CanceledError') {
             console.error('Estimate failed', err);
             // Only show error if it wasn't a manual cancel
          }
        })
        .finally(() => setIsCalculating(false));
    }
  }, [userLocation, destLocation, pickupAddress, destinationAddress]);

  // --- Actions ---
 const handleRequestRide = async (data: RideRequestPayload) => {
    if (!userLocation || !destLocation) return;
    setRideStage('FINDING_DRIVER');
    
    try {
      // 1. Request Ride (Creates Pending Ride)
      const res = await requestRide({
        ...data,
        pickup: { ...userLocation, address: pickupAddress },
        dropoff: { ...destLocation, address: destinationAddress }
      });

      const selectedMethod = PAYMENT_METHODS.find(m => m.id === data.paymentMethodId);

      // 2. Process Payment if Online
      if (selectedMethod && selectedMethod.type !== 'CASH' && selectedMethod.gateway) {
        // Get user email
        const { data: { session } } = await supabase.auth.getSession();
        
        localStorage.setItem('pending_ride', 'true');
        
        const paymentRes = await paymentService.initiatePayment({
            amount: data.price,
            email: session?.user.email || '',
            gateway: selectedMethod.gateway as any,
            method: 'CARD',
            type: 'RIDE',
            rideId: res.rideId
        });

        if (paymentRes.authorizationUrl) {
            window.location.href = paymentRes.authorizationUrl;
            return; // Stop execution, browser handles redirect
        }
      }

      // If Cash or Payment Init Success (but no redirect needed?), set ID
      setActiveRideId(res.rideId); 
    } catch (error: any) {
      console.error(error);
      setRideStage('IDLE');
      const msg = error.response?.data?.message || "Unable to connect to server.";
      setErrorState({ title: "Request Failed", message: msg });
    }
  };

  const handleCancel = async () => {
    if (activeRideId) {
      try {
        await cancelRide(activeRideId);
      } catch (e) { console.error(e); }
    }
    resetApp();
  };

  const resetApp = () => {
    setRideStage('IDLE');
    setActiveRideId(null);
    setDestLocation(null);
    setDestinationAddress('');
    setDriverInfo(null);
    setDriverLocation(undefined);
    setPriceEstimates(null);
  };

  // --- Render Helpers ---
  const renderSidebar = () => {
    switch (rideStage) {
      case 'IDLE':
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
            isRequesting={false}
            isGoogleLoaded={isGoogleLoaded}
            availableRideTypes={rideTypes} // Pass dynamic types
          />
        );
      case 'FINDING_DRIVER':
        return <DriverStatusSkeleton />;
      case 'ON_WAY':
      case 'ARRIVED':
        return driverInfo ? (
          <DriverStatusUI 
            status={rideStage} 
            driver={driverInfo} 
            tripDetails={{ pickup: pickupAddress, dropoff: destinationAddress }} 
            onCancel={handleCancel} 
          />
        ) : <DriverStatusSkeleton />;
      case 'IN_PROGRESS':
        return <TripProgressUI destination={destinationAddress} driverName={driverInfo?.name || 'Driver'} etaMinutes={10} />;
      case 'COMPLETED':
        return <TripCompleteUI pickup={pickupAddress} dropoff={destinationAddress} price={0} driverName={driverInfo?.name || 'Driver'} onClose={resetApp} />;
      default: return null;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col md:flex-row bg-gray-100">
      <div className="absolute inset-0 z-0 md:relative md:flex-1">
        {rideStage === 'IDLE' && (
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
          rideStage={rideStage}
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