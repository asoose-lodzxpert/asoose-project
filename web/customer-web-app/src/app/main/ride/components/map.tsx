'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, Marker, Polyline, Circle } from '@react-google-maps/api';
import { Loader2, AlertCircle, Crosshair } from 'lucide-react';
import { MAP_ICONS } from './mapIcons';
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

  // Custom Markers from Constants
  const markers = useMemo(() => {
    if (!isLoaded || !window.google) return null;
    
    return {
      userLocation: {
        ...MAP_ICONS.userLocation,
        scaledSize: new google.maps.Size(MAP_ICONS.userLocation.scaledSize.width, MAP_ICONS.userLocation.scaledSize.height),
        anchor: new google.maps.Point(MAP_ICONS.userLocation.anchor.x, MAP_ICONS.userLocation.anchor.y),
      },
      pickupPin: {
        ...MAP_ICONS.pickupPin,
        scaledSize: new google.maps.Size(MAP_ICONS.pickupPin.scaledSize.width, MAP_ICONS.pickupPin.scaledSize.height),
        anchor: new google.maps.Point(MAP_ICONS.pickupPin.anchor.x, MAP_ICONS.pickupPin.anchor.y),
      },
      destinationPin: {
        ...MAP_ICONS.destinationPin,
        scaledSize: new google.maps.Size(MAP_ICONS.destinationPin.scaledSize.width, MAP_ICONS.destinationPin.scaledSize.height),
        anchor: new google.maps.Point(MAP_ICONS.destinationPin.anchor.x, MAP_ICONS.destinationPin.anchor.y),
      },
      carIcon: (heading: number) => {
        const iconData = MAP_ICONS.carIcon(heading);
        return {
            ...iconData,
            scaledSize: new google.maps.Size(iconData.scaledSize.width, iconData.scaledSize.height),
            anchor: new google.maps.Point(iconData.anchor.x, iconData.anchor.y),
        };
      },
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
          
          const leg = result.routes[0].legs[0];
          if (onRouteCalculated && leg.distance && leg.duration) {
            onRouteCalculated(leg.distance.value, leg.duration.value);
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
    if (rideStage !== 'ON_WAY' && rideStage !== 'ARRIVED') return;

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
          
          const leg = result.routes[0].legs[0];
          if (onDriverRouteCalculated && leg.distance && leg.duration) {
            onDriverRouteCalculated(leg.distance.value, leg.duration.value);
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

    if (driverPos && (rideStage === 'ON_WAY' || rideStage === 'ARRIVED')) {
      bounds.extend(new google.maps.LatLng(driverPos.lat, driverPos.lng));
    }

    if (destPos && (rideStage === 'IN_PROGRESS' || rideStage === 'IDLE')) {
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
        {/* User Location */}
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

        {/* Destination */}
        {destPos && markers && (
          <Marker 
            position={destPos} 
            icon={markers.destinationPin}
            zIndex={99}
          />
        )}

        {/* Main Route */}
        {route.length > 0 && (rideStage === 'IDLE' || rideStage === 'IN_PROGRESS') && (
          <Polyline
            path={route}
            options={{
              strokeColor: rideStage === 'IN_PROGRESS' ? '#10b981' : '#6b7280',
              strokeOpacity: 0.8,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}

        {/* Driver Route */}
        {driverRoute.length > 0 && (rideStage === 'ON_WAY' || rideStage === 'ARRIVED') && (
          <Polyline
            path={driverRoute}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.7,
              strokeWeight: 4,
              geodesic: true,
              icons: [{
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, scale: 3 },
                offset: '0',
                repeat: '20px'
              }]
            }}
          />
        )}

        {/* Driver Car */}
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
          <Crosshair className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded pointer-events-none">
        © Google Maps
      </div>
    </div>
  );
}