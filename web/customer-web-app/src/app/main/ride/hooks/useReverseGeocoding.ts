'use client';

import { useEffect, useRef } from 'react';
import { useRideStore } from '../store/ride';

/**
 * useReverseGeocoding — Converts map-pin coordinates into address text.
 * 
 * IMPORTANT: Only reverse-geocodes when the address is currently empty.
 * This prevents overwriting addresses that were already set by the
 * autocomplete selection (which triggers a location change in the store).
 * 
 * Flow:
 *   Autocomplete select → setPickupAddress("Lagos Airport") + setPickupLocation({...})
 *   This hook sees pickupLocation changed, checks pickupAddress — it's non-empty → SKIP.
 *   
 *   Map pin drag → setPickupLocation({...}) with NO address set
 *   This hook sees pickupLocation changed, checks pickupAddress — it's empty → GEOCODE.
 */
export function useReverseGeocoding() {
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const pickupAddress = useRideStore((state) => state.pickupAddress);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress);
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.google &&
      window.google.maps &&
      typeof window.google.maps.Geocoder === 'function' &&
      !geocoder.current
    ) {
      geocoder.current = new window.google.maps.Geocoder();
    }
  }, []);

  const fetchAddress = (
    location: google.maps.LatLngLiteral, 
    setter: (addr: string) => void
  ) => {
    if (!geocoder.current) return;

    geocoder.current.geocode({ location }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setter(results[0].formatted_address);
      } else {
        console.warn("Geocoding failed:", status);
      }
    });
  };

  // Only reverse-geocode pickup if address is empty (map pin, not autocomplete)
  useEffect(() => {
    if (pickupLocation && !pickupAddress) {
      fetchAddress(pickupLocation, setPickupAddress);
    }
  }, [pickupLocation, pickupAddress, setPickupAddress]);

  // Only reverse-geocode dropoff if address is empty (map pin, not autocomplete)
  useEffect(() => {
    if (dropoffLocation && !dropoffAddress) {
      fetchAddress(dropoffLocation, setDropoffAddress);
    }
  }, [dropoffLocation, dropoffAddress, setDropoffAddress]);
}