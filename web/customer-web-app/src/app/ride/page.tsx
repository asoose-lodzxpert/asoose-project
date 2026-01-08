'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navigation, Loader2 } from 'lucide-react';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';

// Components & Services
import GoogleMapView from './components/map';
import RideSelector, { RideRequestData } from './components/RideSelector';
import SearchOverlay from './components/SearchOverlay';
import DriverStatusUI, { TripStatus } from './components/DriverStatus';
import TripProgressUI from './components/TripProgressUI';
import TripCompleteUI from './components/TripCompleteUi';
import { RideUiSkeleton } from './components/Skeleton';
import { getRideEstimate, requestRide, cancelRide } from '@/services/ride.service';
import { useRideSocket } from '@/hooks/useRideSocket';

const GOOGLE_LIBS: Libraries = ['places'];

type PageView = 'IDLE' | 'SEARCH_MODE' | 'FINDING_DRIVER' | TripStatus | 'IN_PROGRESS' | 'COMPLETED';

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: isGoogleLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: GOOGLE_LIBS,
  });

  // --- STATE ---
  const [rideStage, setRideStage] = useState<PageView>('IDLE');
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  
  // Location
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [destLocation, setDestLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupAddress, setPickupAddress] = useState('Locating...');
  const [driverLocation, setDriverLocation] = useState<google.maps.LatLngLiteral | undefined>(undefined);

  // Data
  const [priceEstimates, setPriceEstimates] = useState<any>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // --- SOCKET HANDLER ---
  // Listens for real backend events
  const handleSocketEvent = useCallback((event: any) => {
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
        alert('No drivers available. Please try again.');
        setRideStage('IDLE');
        break;
    }
  }, []);

  useRideSocket(handleSocketEvent);

  // --- GEOLOCATION ---
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation || !isGoogleLoaded) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        
        // Reverse Geocode for Address Name
        const geocoder = new google.maps.Geocoder();
        const res = await geocoder.geocode({ location: coords });
        if (res.results[0]) setPickupAddress(res.results[0].formatted_address);
      },
      (err) => console.error(err)
    );
  }, [isGoogleLoaded]);

  useEffect(() => {
    if (isGoogleLoaded && !userLocation) handleLocateMe();
  }, [isGoogleLoaded, userLocation, handleLocateMe]);

  // --- CALCULATE ESTIMATE ---
  useEffect(() => {
    if (userLocation && destLocation) {
      setIsCalculating(true);
      getRideEstimate(userLocation, destLocation)
        .then(data => setPriceEstimates(data))
        .catch(err => console.error('Estimate failed', err))
        .finally(() => setIsCalculating(false));
    }
  }, [userLocation, destLocation]);

  // --- ACTIONS ---
  const handleRequestRide = async (data: RideRequestData) => {
    if (!userLocation || !destLocation) return;
    setRideStage('FINDING_DRIVER');
    
    try {
      const res = await requestRide({
        pickup: userLocation,
        dropoff: destLocation,
        rideType: data.rideType,
        price: data.price,
        paymentMethodId: data.paymentMethodId
      });
      setActiveRideId(res.rideId); // Store ID to track or cancel
    } catch (error) {
      console.error(error);
      alert('Failed to request ride');
      setRideStage('IDLE');
    }
  };

  const handleCancel = async () => {
    if (activeRideId) await cancelRide(activeRideId);
    resetApp();
  };

  const resetApp = () => {
    setRideStage('IDLE');
    setActiveRideId(null);
    setDestLocation(null);
    setDriverInfo(null);
    setDriverLocation(undefined);
    router.replace('/');
  };

  // --- RENDER ---
  const renderSidebar = () => {
    if (!isGoogleLoaded) return <RideUiSkeleton />;

    if (searchParams.get('mode') === 'search') {
      return (
        <SearchOverlay 
          onBack={() => router.back()} 
          onSelect={(place) => {
             setDestLocation({ lat: place.lat, lng: place.lng });
             router.replace(`/?destination=${place.name}`);
          }}
          currentQuery={searchParams.get('destination') || ''}
        />
      );
    }

    switch (rideStage) {
      case 'IDLE':
        return (
          <RideSelector 
            destination={searchParams.get('destination') || ''}
            pickupAddress={pickupAddress}
            onSearchClick={() => router.push('/?mode=search')} 
            priceEstimates={priceEstimates}
            isCalculatingPrice={isCalculating}
            onRequestRide={handleRequestRide}
            isRequesting={false}
          />
        );
      case 'FINDING_DRIVER':
        return (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-white animate-in fade-in">
             <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
             <h2 className="text-xl font-bold">Connecting you to a driver...</h2>
             <button onClick={handleCancel} className="mt-8 text-red-500 font-bold">Cancel Request</button>
          </div>
        );
      case 'ON_WAY':
      case 'ARRIVED':
        return (
          <DriverStatusUI 
            status={rideStage} 
            driver={driverInfo} 
            tripDetails={{ pickup: pickupAddress, dropoff: searchParams.get('destination') }} 
            onCancel={handleCancel} 
          />
        );
      case 'IN_PROGRESS':
        return <TripProgressUI destination={searchParams.get('destination') || ''} driverName={driverInfo?.name} etaMinutes={10} />;
      case 'COMPLETED':
        return <TripCompleteUI pickup={pickupAddress} dropoff={searchParams.get('destination') || ''} price={0} date="Today" driverName={driverInfo?.name} onClose={resetApp} />;
      default: return null;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col md:flex-row bg-gray-100">
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col md:static md:w-[450px] md:h-full md:bg-white md:shadow-xl md:pointer-events-auto">
        {renderSidebar()}
      </div>

      <div className="absolute inset-0 z-0 md:relative md:flex-1">
        {rideStage === 'IDLE' && (
          <button onClick={handleLocateMe} className="absolute bottom-32 right-4 md:bottom-8 z-[50] bg-white p-3 rounded-lg shadow-lg">
             <Navigation className="w-6 h-6 text-gray-700" />
          </button>
        )}
        <GoogleMapView 
          isLoaded={isGoogleLoaded}
          userPos={userLocation}
          destPos={destLocation}
          tripStatus={rideStage}
          driverPos={driverLocation}
        />
      </div>
    </div>
  );
}