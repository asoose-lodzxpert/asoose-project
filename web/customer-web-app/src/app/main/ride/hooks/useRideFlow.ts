import { useState, useCallback } from "react";
import { RideService, RideStatus } from "@/services/ride.service";
import { useRideStore, RideStage } from "@/store/useRideStore";
import { toast } from "react-toastify";

const mapBackendStatus = (status: RideStatus): RideStage => {
  switch (status) {
    case "PENDING":
    case "REQUESTED": return "FINDING_DRIVER";
    case "ACCEPTED": return "ON_WAY";
    case "ARRIVED": return "ARRIVED";
    case "IN_PROGRESS": return "IN_PROGRESS";
    case "COMPLETED": return "COMPLETED";
    default: return "IDLE";
  }
};

export const useRideFlow = (token: string | null) => {
  const { setRideStage, rideStage, setDriverInfo, resetRide } = useRideStore();
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const syncRideState = useCallback(async () => {
    if (!token) return;
    try {
      const ride = await RideService.getCurrentRide(token);
      if (ride) {
        useRideStore.setState({ activeRideId: ride.id });
        setRideStage(mapBackendStatus(ride.status));
        if (ride.rider) setDriverInfo(ride.rider);

        // FIXED: Stop aggressive polling memory leak
        if (["ACCEPTED", "IN_PROGRESS", "ARRIVED", "COMPLETED"].includes(ride.status)) {
          localStorage.removeItem("pending_ride");
        }
      } else if (rideStage !== "IDLE" && rideStage !== "COMPLETED") {
        resetRide();
      }
    } catch (e) {
      console.error("State sync failed", e);
    }
  }, [token, rideStage, setRideStage, setDriverInfo, resetRide]);

  const cancelRide = useCallback(async () => {
    const { activeRideId } = useRideStore.getState();
    if (activeRideId && token) {
      try {
        await RideService.cancelRide(activeRideId, "User cancelled", token);
        toast.info("Ride cancelled");
      } catch (e) {
        console.error(e);
        toast.error("Failed to cancel ride");
      }
    }
    resetRide();
    localStorage.removeItem("pending_ride");
  }, [token, resetRide]);

  return { error, setError, syncRideState, cancelRide };
};