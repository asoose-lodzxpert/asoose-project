'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };

// Custom Uber-like map style (Clean, minimal labels)
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

const ICONS = {
  pickup: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#10b981', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 },
  dropoff: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#ef4444', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 },
  car: {
    path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.543v6.342c0,2.376,1.406,4.425,3.384,5.372v5.991c0,1.31,1.065,2.376,2.376,2.376h1.058c1.31,0,2.376-1.066,2.376-2.376v-1.615h4.746v1.615c0,1.31,1.065,2.376,2.376,2.376h1.058c1.31,0,2.376-1.066,2.376-2.376v-5.991c1.978-0.947,3.385-2.996,3.385-5.372V6.543C23.045,3.467,20.519,0,17.402,0z',
    fillColor: '#000000',
    fillOpacity: 1,
    scale: 1,
    rotation: 0,
    anchor: { x: 11.5, y: 13 } as any,
  }
};

interface MapProps {
  userPos: google.maps.LatLngLiteral | null;
  destPos: google.maps.LatLngLiteral | null;
  tripStatus?: string;
  isLoaded: boolean;
  driverPos?: google.maps.LatLngLiteral; // Real driver position from socket
}

export default function GoogleMapView({ userPos, destPos, tripStatus, isLoaded, driverPos }: MapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  // Calculate Route using Google Directions API
  useEffect(() => {
    if (!isLoaded || !userPos || !destPos) return;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: userPos,
        destination: destPos,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
        }
      }
    );
  }, [isLoaded, userPos, destPos]);

  // Adjust Camera bounds
  useEffect(() => {
    if (mapRef.current && directions) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userPos!);
      bounds.extend(destPos!);
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 200, left: 50, right: 50 });
    }
  }, [directions, userPos, destPos]);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  if (!isLoaded) return <div className="h-full flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={userPos || { lat: 9.0765, lng: 7.3986 }}
      zoom={14}
      onLoad={onLoad}
      options={mapOptions}
    >
      {userPos && <Marker position={userPos} icon={ICONS.pickup} />}
      {destPos && <Marker position={destPos} icon={ICONS.dropoff} />}
      
      {/* Real Driver Position Marker */}
      {driverPos && <Marker position={driverPos} icon={ICONS.car} />}

      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#000000', strokeWeight: 4 }
          }}
        />
      )}
    </GoogleMap>
  );
}