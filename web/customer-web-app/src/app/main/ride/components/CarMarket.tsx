'use client';
import { memo, useEffect, useRef } from 'react';
import { Marker } from '@react-google-maps/api';
import { useRideStore } from '../store/ride';
const CarMarkerComponent = ({ position }: { position: google.maps.LatLngLiteral }) => {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const driverLocation = useRideStore((state) => state.driverLocation);

  useEffect(() => {
    if (markerRef.current && driverLocation) {
      const newPosition = new google.maps.LatLng(driverLocation.lat, driverLocation.lng);
      markerRef.current.setPosition(newPosition);
    }
  }, [driverLocation]);

  const bearing = driverLocation ? google.maps.geometry.spherical.computeHeading(
    new google.maps.LatLng(position.lat, position.lng),
    new google.maps.LatLng(driverLocation.lat, driverLocation.lng)
  ) : 0;

  return (
    <Marker
      position={position}
      icon={{
        path: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
        fillColor: 'white',
        fillOpacity: 1,
        strokeWeight: 0,
        rotation: bearing,
        scale: 1,
        anchor: new google.maps.Point(12, 12),
      }}
      onLoad={(marker) => {
        markerRef.current = marker;
      }}
    />
  );
};

export const CarMarker = memo(CarMarkerComponent);