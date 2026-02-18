'use client';
import { memo, useEffect, useRef } from 'react';
import { Marker } from '@react-google-maps/api';

const ANIMATION_DURATION = 1000; // Time to travel between updates (matches socket frequency approx)

interface CarMarkerProps {
  position: google.maps.LatLngLiteral;
  heading?: number;
}

const CarMarkerComponent = ({ position, heading = 0 }: CarMarkerProps) => {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const prevPosition = useRef<google.maps.LatLngLiteral>(position);
  const startTime = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    // 1. Safety Checks
    if (!markerRef.current || !position) return;
    
    // Check if Geometry library is available (required for heading calc)
    if (!google.maps.geometry) {
        console.warn("Google Maps Geometry library missing. Car rotation may fail.");
        return;
    }

    // 2. Setup Animation
    const startPos = prevPosition.current;
    const targetPos = position;
    
    // If distance is tiny, skip animation (prevents jitter)
    if (Math.abs(startPos.lat - targetPos.lat) < 0.00001 && 
        Math.abs(startPos.lng - targetPos.lng) < 0.00001) {
        return;
    }

    startTime.current = null;
    
    // Calculate direction for this specific movement
    const moveHeading = google.maps.geometry.spherical.computeHeading(startPos, targetPos);

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // 3. Interpolate Position
      const lat = startPos.lat + (targetPos.lat - startPos.lat) * progress;
      const lng = startPos.lng + (targetPos.lng - startPos.lng) * progress;

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
        
        // Update Icon Rotation
        const icon = markerRef.current.getIcon() as google.maps.Symbol;
        if (icon) {
          markerRef.current.setIcon({
            ...icon,
            rotation: moveHeading // Face the direction of movement
          });
        }
      }

      // 4. Loop or Finish
      if (progress < 1) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        prevPosition.current = targetPos;
      }
    };

    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [position]); 

  return (
    <Marker
      position={position}
      onLoad={(marker) => {
        markerRef.current = marker;
        marker.setPosition(position);
        
        // Uber-like Car Icon
        marker.setIcon({
          path: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z', 
          fillColor: 'black',
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: 'white',
          scale: 1.2,
          anchor: new google.maps.Point(12, 12),
          rotation: heading, 
        });
      }}
    />
  );
};

export const CarMarker = memo(CarMarkerComponent);