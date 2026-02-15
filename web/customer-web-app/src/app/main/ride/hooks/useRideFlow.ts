import { useState, useCallback, useRef } from "react";
import { RideService } from "@/services/ride.service";
import { useRideStore } from "@/store/useRideStore";
import { toast } from "react-toastify";

export const useRideFlow = (token: string | null) => {
  const { syncState, reset } = useRideStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const syncRideState = useCallback(async () => {
    if (!token) return;
    
    // Prevent overlapping sync requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSyncing(true);
    try {
      const ride = await RideService.getCurrentRide(token, abortControllerRef.current.signal);
      syncState(ride); // Push directly to read-only store
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("Critical: State sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [token, syncState]);

  const cancelRide = useCallback(async () => {
    const activeRide = useRideStore.getState().activeRide;
    if (activeRide?.id && token) {
      try {
        await RideService.cancelRide(activeRide.id, "User cancelled", token);
        toast.info("Ride cancelled successfully.");
        reset();
      } catch (e) {
        toast.error("Failed to cancel ride. Driver may be arriving.");
      }
    } else {
      reset();
    }
  }, [token, reset]);

  return { isSyncing, syncRideState, cancelRide };
};