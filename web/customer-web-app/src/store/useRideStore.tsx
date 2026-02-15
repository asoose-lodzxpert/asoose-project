"use client";
import { create } from "zustand";

export type RideStage = "IDLE" | "PROCESSING_PAYMENT" | "FINDING_DRIVER" | "ON_WAY" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface RideState {
  rideStage: RideStage;
  activeRide: any | null; 
  syncState: (backendRide: any | null) => void;
  reset: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  rideStage: "IDLE",
  activeRide: null,

  syncState: (backendRide) => {
    if (!backendRide) {
      set({ rideStage: "IDLE", activeRide: null });
      return;
    }
    
    // Strict mapping from backend enum to frontend stage
    const stageMap: Record<string, RideStage> = {
      PENDING: "PROCESSING_PAYMENT",
      REQUESTED: "FINDING_DRIVER",
      ACCEPTED: "ON_WAY",
      ARRIVED: "ARRIVED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED"
    };
    
    set({
      activeRide: backendRide,
      rideStage: stageMap[backendRide.status] || "IDLE",
    });
  },

  reset: () => set({ rideStage: "IDLE", activeRide: null }),
}));