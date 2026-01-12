'use client';

import React, { useMemo } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
// Import your custom hook from the global provider
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';

const containerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

interface MapProps {
  pos: [number, number]; // [lat, lng]
  popupText?: string;
}

const RiderGoogleMap = ({ pos }: MapProps) => {
  // Use the global loading state instead of useJsApiLoader
  const { isLoaded } = useGoogleMaps();

  const center = useMemo(() => ({ lat: pos[0], lng: pos[1] }), [pos]);

  // Marker icon remains the same
  const markerIcon = useMemo(() => {
    if (!isLoaded) return null;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="15" fill="#eab308" stroke="#ffffff" stroke-width="3"/>
          <circle cx="20" cy="20" r="5" fill="#000000"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    };
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-[#1E293B] flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-2" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading Maps...</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
    >
      <Marker 
        position={center} 
        icon={markerIcon as google.maps.Icon} 
      />
    </GoogleMap>
  );
};

export default RiderGoogleMap;