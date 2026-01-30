import { useState, useEffect, useRef } from 'react';
import { RideService, VehicleType } from "@/services/ride.service";

export const useRideEstimates = (
  pickup: google.maps.LatLngLiteral | null,
  dropoff: google.maps.LatLngLiteral | null,
  vehicleType: VehicleType,
  token: string | null
) => {
  const [estimates, setEstimates] = useState<any | null>(null); // Replace 'any' with PriceEstimate type
  const [loading, setLoading] = useState(false);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!pickup || !dropoff || !token) return;

    // Resource Management: Cancel previous pending request
    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();

    const fetchEstimates = async () => {
      setLoading(true);
      try {
        const data = await RideService.getEstimate({
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffLat: dropoff.lat,
          dropoffLng: dropoff.lng,
          vehicleType,
        }, token);
        setEstimates(data);
      } catch (error: any) {
        if (error.name !== 'CanceledError') {
          console.error("Estimate error:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    // Phase 3.2: Debouncing (500ms)
    const timer = setTimeout(fetchEstimates, 500);
    return () => clearTimeout(timer);
  }, [pickup, dropoff, vehicleType, token]);

  return { estimates, loading };
};