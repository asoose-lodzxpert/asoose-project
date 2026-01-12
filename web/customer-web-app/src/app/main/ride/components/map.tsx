'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, Marker, Polyline, Circle } from '@react-google-maps/api';
import { Loader2, Navigation, AlertCircle } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

interface MapProps {
  userPos: { lat: number; lng: number } | null;
  destPos: { lat: number; lng: number; address?: string } | null;
  isLoaded: boolean;
  driverPos?: { lat: number; lng: number } | null;
  rideStage?: string;
  onRouteCalculated?: (distance: number, duration: number) => void;
  onDriverRouteCalculated?: (distance: number, duration: number) => void;
}

export default function GoogleMapView({ 
  userPos, 
  destPos, 
  isLoaded, 
  driverPos,
  rideStage = 'IDLE',
  onRouteCalculated,
  onDriverRouteCalculated
}: MapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [route, setRoute] = useState<google.maps.LatLng[]>([]);
  const [driverRoute, setDriverRoute] = useState<google.maps.LatLng[]>([]);
  const [animatedDriverPos, setAnimatedDriverPos] = useState(driverPos);
  const [carHeading, setCarHeading] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  // Custom SVG Markers
  const markers = useMemo(() => {
    if (!isLoaded) return null;
    
    return {
      userLocation: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
            <circle cx="20" cy="20" r="6" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
      },
      pickupPin: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#10b981"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <circle cx="16" cy="16" r="4" fill="#10b981"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 42),
        anchor: new google.maps.Point(16, 42),
      },
      destinationPin: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#ef4444"/>
            <rect x="11" y="11" width="10" height="10" rx="1" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 42),
        anchor: new google.maps.Point(16, 42),
      },
      carIcon: (heading: number) => ({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(24, 24) rotate(${heading}) translate(-24, -24)">
              <ellipse cx="24" cy="28" rx="16" ry="10" fill="rgba(0,0,0,0.2)"/>
              <path d="M24 8 L32 28 L28 28 L28 32 L20 32 L20 28 L16 28 Z" fill="#000000" stroke="white" stroke-width="1.5"/>
              <circle cx="20" cy="30" r="2" fill="white"/>
              <circle cx="28" cy="30" r="2" fill="white"/>
              <path d="M24 8 L26 14 L22 14 Z" fill="#fbbf24"/>
            </g>
          </svg>
        `),
        scaledSize: new google.maps.Size(48, 48),
        anchor: new google.maps.Point(24, 24),
      }),
    };
  }, [isLoaded]);

  // Calculate main route (user to destination)
  useEffect(() => {
    if (!isLoaded || !userPos || !destPos || !window.google) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userPos,
        destination: destPos,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          const path = result.routes[0].overview_path;
          setRoute(path);
          
          // Extract distance and duration
          const leg = result.routes[0].legs[0];
          if (onRouteCalculated && leg.distance && leg.duration) {
            onRouteCalculated(
              leg.distance.value, // meters
              leg.duration.value  // seconds
            );
          }
          
          setMapError(null);
        } else {
          setMapError('Unable to calculate route');
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [isLoaded, userPos, destPos, onRouteCalculated]);

  // Calculate driver route (driver to user pickup)
  useEffect(() => {
    if (!isLoaded || !driverPos || !userPos || !window.google) return;
    if (rideStage !== 'DRIVER_ASSIGNED' && rideStage !== 'DRIVER_ARRIVING') return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: driverPos,
        destination: userPos,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          const path = result.routes[0].overview_path;
          setDriverRoute(path);
          
          // Extract driver ETA
          const leg = result.routes[0].legs[0];
          if (onDriverRouteCalculated && leg.distance && leg.duration) {
            onDriverRouteCalculated(
              leg.distance.value,
              leg.duration.value
            );
          }
        }
      }
    );
  }, [isLoaded, driverPos, userPos, rideStage, onDriverRouteCalculated]);

  // Smooth car animation with heading calculation
  useEffect(() => {
    if (!driverPos) {
      setAnimatedDriverPos(null);
      return;
    }

    if (!animatedDriverPos) {
      setAnimatedDriverPos(driverPos);
      return;
    }

    // Calculate heading
    const calcHeading = (from: typeof driverPos, to: typeof driverPos) => {
      const lat1 = (from.lat * Math.PI) / 180;
      const lat2 = (to.lat * Math.PI) / 180;
      const dLng = ((to.lng - from.lng) * Math.PI) / 180;
      
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - 
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      
      return (Math.atan2(y, x) * 180) / Math.PI;
    };

    const heading = calcHeading(animatedDriverPos, driverPos);
    setCarHeading(heading);

    // Smooth animation
    let frame = 0;
    const totalFrames = 60;
    const startPos = { ...animatedDriverPos };
    const endPos = { ...driverPos };

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedDriverPos({
        lat: startPos.lat + (endPos.lat - startPos.lat) * easeProgress,
        lng: startPos.lng + (endPos.lng - startPos.lng) * easeProgress,
      });

      if (frame < totalFrames) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [driverPos]);

  // Center map on user location
  const centerOnUser = useCallback(() => {
    if (mapRef.current && userPos) {
      mapRef.current.panTo(userPos);
      mapRef.current.setZoom(16);
    }
  }, [userPos]);

  // Auto-adjust view based on ride stage
  useEffect(() => {
    if (!mapRef.current || !userPos) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(userPos.lat, userPos.lng));

    if (driverPos && (rideStage === 'DRIVER_ASSIGNED' || rideStage === 'DRIVER_ARRIVING')) {
      bounds.extend(new google.maps.LatLng(driverPos.lat, driverPos.lng));
    }

    if (destPos && (rideStage === 'IN_RIDE' || rideStage === 'IDLE')) {
      bounds.extend(new google.maps.LatLng(destPos.lat, destPos.lng));
    }

    mapRef.current.fitBounds(bounds, {
      top: 80,
      right: 50,
      bottom: rideStage === 'IDLE' ? 500 : 400,
      left: 50,
    });
  }, [rideStage, userPos, destPos, driverPos]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Handle geolocation errors
  useEffect(() => {
    if (!userPos && isLoaded) {
      setMapError('Location access required. Please enable location services.');
    }
  }, [userPos, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const center = userPos || { lat: 9.07, lng: 7.39 };

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* User Location Marker with Accuracy Circle */}
        {userPos && markers && (
          <>
            <Circle
              center={userPos}
              radius={50}
              options={{
                fillColor: '#10b981',
                fillOpacity: 0.1,
                strokeColor: '#10b981',
                strokeOpacity: 0.3,
                strokeWeight: 1,
              }}
            />
            <Marker 
              position={userPos} 
              icon={rideStage === 'IDLE' ? markers.userLocation : markers.pickupPin}
              zIndex={100}
            />
          </>
        )}

        {/* Destination Marker */}
        {destPos && markers && (
          <Marker 
            position={destPos} 
            icon={markers.destinationPin}
            zIndex={99}
          />
        )}

        {/* Main Route Polyline (user to destination) */}
        {route.length > 0 && (rideStage === 'IDLE' || rideStage === 'IN_RIDE') && (
          <Polyline
            path={route}
            options={{
              strokeColor: rideStage === 'IN_RIDE' ? '#10b981' : '#6b7280',
              strokeOpacity: 0.8,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}

        {/* Driver Route Polyline (driver to pickup) */}
        {driverRoute.length > 0 && (rideStage === 'DRIVER_ASSIGNED' || rideStage === 'DRIVER_ARRIVING') && (
          <Polyline
            path={driverRoute}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.7,
              strokeWeight: 4,
              geodesic: true,
              icons: [{
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 0.7,
                  scale: 3,
                },
                offset: '0',
                repeat: '20px'
              }]
            }}
          />
        )}

        {/* Driver Car Marker */}
        {animatedDriverPos && markers && (
          <>
            <Marker
              position={animatedDriverPos}
              icon={markers.carIcon(carHeading)}
              zIndex={200}
            />
            <Circle
              center={animatedDriverPos}
              radius={30}
              options={{
                fillColor: '#000000',
                fillOpacity: 0.08,
                strokeColor: '#000000',
                strokeOpacity: 0.2,
                strokeWeight: 1,
              }}
            />
          </>
        )}
      </GoogleMap>

      {/* Error Banner */}
      {mapError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-20">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{mapError}</span>
        </div>
      )}

      {/* Recenter Button */}
      {userPos && (
        <button
          onClick={centerOnUser}
          className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors z-10 active:scale-95"
          aria-label="Center on your location"
        >
          <Navigation className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded pointer-events-none">
        © Google Maps
      </div>
    </div>
  );
}