import { useState, useEffect, useRef } from "react";
import { RideService, PriceEstimate, LocationPayloadDto } from "@/services/ride.service";

export const useRideEstimates = (
  pickup: LocationPayloadDto | null,
  dropoff: LocationPayloadDto | null,
  token: string | null
) => {
  const [estimates, setEstimates] = useState<Record<string, PriceEstimate> | null>(null);
  const [loading, setLoading] = useState(false);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    // CRITICAL FIX: Explicitly set loading to false in the early return
    // This prevents the UI from getting permanently stuck if inputs are cleared mid-fetch
    if (!token || (!pickup?.placeId && !pickup?.lat) || (!dropoff?.placeId && !dropoff?.lat)) {
      setEstimates(null);
      setLoading(false); 
      return;
    }

    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();
    const { signal } = abortController.current;

    const fetchEstimates = async () => {
      setLoading(true);
      try {
        const data = await RideService.getEstimate({
          pickupPlaceId: pickup.placeId, pickupLat: pickup.lat, pickupLng: pickup.lng,
          dropoffPlaceId: dropoff.placeId, dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
        }, token, signal);
        
        if (!signal.aborted) setEstimates(data);
      } catch (error: any) {
        if (error.name !== "AbortError" && error.name !== "CanceledError") {
          console.error("Estimate failed:", error);
          if (!signal.aborted) setEstimates(null);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchEstimates, 500); // 500ms Debounce
    return () => clearTimeout(timer);
  }, [pickup, dropoff, token]);

  return { estimates, loading };
};