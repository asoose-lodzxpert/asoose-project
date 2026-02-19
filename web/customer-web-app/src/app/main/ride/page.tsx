"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { RideController } from "./components/RideController";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { MapView } from "./components/MapView";
import { UserLocationTracker } from "./components/UserLocationTracker";
import { MapCameraManager } from "./components/MapCameraManager";
import { RideSocketListener } from "./components/RideSocketListener";
import { useRideStore } from "./store/ride";
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { RideSafetyControls } from "./components/RideSafetyControls";
import { useRideSynchronization } from "./hooks/useRideSynchronization";
import { Sidebar } from "./components/Sidebar";
import { socketService } from "@/services/socket.service";

export default function Home() {
  const { data: session } = useSession();
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const rideId = useRideStore((state) => state.rideId);

  // Connect socket when authenticated
  useEffect(() => {
    if (session?.accessToken && !socketService.isConnected()) {
      socketService.connect(session.accessToken);
    }
    return () => {
      socketService.disconnect();
    };
  }, [session?.accessToken]);

  // Activate State Recovery
  useRideSynchronization();

  const isRideActive = [
    "searching",
    "confirmed",
    "arrived",
    "in-progress",
  ].includes(rideStatus);

  // Sidebar-hosted states: idle (RideSelection) and configuring (LocationSelector)
  const showSidebar = rideStatus === "idle" || isConfiguring;

  return (
    <GlobalErrorBoundary>
      <div className="relative flex flex-row h-[calc(100vh-64px-56px)] w-full overflow-hidden">
        {/* --- Invisible logic-only components --- */}
        <UserLocationTracker />
        <MapCameraManager />
        {/* Only mount socket listener when we have a confirmed rideId — prevents
            a stale persisted status from opening a socket channel against no ride */}
        {isRideActive && rideId && <RideSocketListener />}

        {/* --- Sidebar (left column, only for idle/configuring) --- */}
        {showSidebar && (
          <div className="z-20 w-full max-w-md md:w-[450px] md:min-w-[450px] h-full flex-shrink-0">
            <Sidebar>
              <RideController />
            </Sidebar>
          </div>
        )}

        {/* --- Map (fills remaining space) --- */}
        <div className="flex-1 h-full w-full relative">
          <MapView />

          {/* --- Floating overlays (positioned over the map) --- */}
          <GlobalErrorBanner />
          <RideSafetyControls />

          {/* --- Ride-state floating panels (searching, confirmed, arrived, in-progress, finished) --- */}
          {!showSidebar && <RideController />}
        </div>
      </div>
    </GlobalErrorBoundary>
  );
}
