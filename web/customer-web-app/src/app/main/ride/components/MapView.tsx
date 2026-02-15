'use client';

import { useCallback } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { useRideStore } from '../store/ride';
import { CarMarker } from './CarMarket';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

const defaultCenter = {
  lat: 11.8345, // Maiduguri center
  lng: 13.1507,
};

const mapOptions = {
  styles: [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "featureType": "administrative.locality",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{ "color": "#263c3f" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#6b9a76" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#38414e" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#212a37" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#9ca5b3" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#1f2835" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#f3d19c" }]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{ "color": "#2f3948" }]
    },
    {
      "featureType": "transit.station",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#17263c" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#515c6d" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#17263c" }]
    }
  ],
  disableDefaultUI: true,
};

export function MapView() {
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const driverLocation = useRideStore((state) => state.driverLocation);
  const setMapInstance = useRideStore((state) => state.setMapInstance);
  const setIsGoogleMapsLoaded = useRideStore((state) => state.setIsGoogleMapsLoaded);
  const routePolyline = useRideStore((state) => state.routePolyline);
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);

  // CHANGED: Consume global context instead of initializing a new loader
  const { isLoaded, loadError } = useGoogleMaps();

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    setIsGoogleMapsLoaded(true);
  }, [setMapInstance, setIsGoogleMapsLoaded]);

  const onMapUnmount = useCallback(() => {
    setMapInstance(null);
    setIsGoogleMapsLoaded(false);
  }, [setMapInstance, setIsGoogleMapsLoaded]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    if (isConfiguring === 'pickup') {
      setPickupLocation(location);
    } else if (isConfiguring === 'dropoff') {
      setDropoffLocation(location);
    }
  };

  if (loadError) {
    return <div>Error loading maps. Please check the API key and internet connection.</div>;
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={12}
      options={mapOptions}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
      onClick={handleMapClick}
    >
      {pickupLocation && <Marker position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }} label={{ text: "P", color: "white" }} />}
      {dropoffLocation && <Marker position={{ lat: dropoffLocation.lat, lng: dropoffLocation.lng }} label={{ text: "D", color: "white" }} />}
      
      {routePolyline && (
        <Polyline
          path={google.maps.geometry.encoding.decodePath(routePolyline)}
          options={{
            strokeColor: '#4A90E2',
            strokeOpacity: 0.8,
            strokeWeight: 6,
            geodesic: true,
          }}
        />
      )}

      {driverLocation && <CarMarker position={driverLocation} />}
    </GoogleMap>
  ) : <div>Loading Map...</div>;
}