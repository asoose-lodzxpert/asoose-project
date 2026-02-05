import { useState, useCallback } from "react";
import { RideService, Ride, Driver, RideStatus } from "@/services/ride.service";
import { toast } from "react-toastify"; // Assuming toast is available or use console

export type PageView =
  | "IDLE"
  | "FINDING_DRIVER"
  | "ON_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED";

export const useRideFlow = (token: string | null) => {
  const [stage, setStage] = useState<PageView>("IDLE");
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(
    null,
  );

  const mapBackendStatus = (status: RideStatus): PageView => {
    switch (status) {
      case "PENDING":
      case "REQUESTED":
        return "FINDING_DRIVER";
      case "ACCEPTED":
        return "ON_WAY";
      case "ARRIVED":
        return "ARRIVED";
      case "IN_PROGRESS":
        return "IN_PROGRESS";
      case "COMPLETED":
        return "COMPLETED";
      default:
        return "IDLE";
    }
  };

  const syncRideState = useCallback(async () => {
    if (!token) return;
    try {
      const ride = await RideService.getCurrentRide(token);
      if (ride) {
        setActiveRideId(ride.id);
        setStage(mapBackendStatus(ride.status));
        if (ride.driver) setDriverInfo(ride.driver);
      } else if (stage !== "IDLE" && stage !== "COMPLETED") {
        resetFlow();
      }
    } catch (e) {
      console.error("State sync failed", e);
    }
  }, [token, stage]);

  const resetFlow = useCallback(() => {
    setStage("IDLE");
    setActiveRideId(null);
    setDriverInfo(null);
  }, []);

  const cancelRide = useCallback(async () => {
    if (activeRideId && token) {
      try {
        await RideService.cancelRide(activeRideId, "User cancelled", token);
        toast.info("Ride cancelled");
      } catch (e) {
        console.error(e);
        toast.error("Failed to cancel ride");
      }
    }
    resetFlow();
  }, [activeRideId, token, resetFlow]);

  return {
    stage,
    setStage,
    activeRideId,
    setActiveRideId,
    driverInfo,
    setDriverInfo,
    error,
    setError,
    syncRideState,
    resetFlow,
    cancelRide,
  };
};
