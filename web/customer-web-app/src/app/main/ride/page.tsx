'use client';

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

export default function Home() {
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);

  // Activate State Recovery
  useRideSynchronization();

  const isRideActive = [
    'searching',
    'confirmed',
    'arrived',
    'in-progress'
  ].includes(rideStatus);

  // Sidebar-hosted states: idle (RideSelection) and configuring (LocationSelector)
  const showSidebar = rideStatus === 'idle' || isConfiguring;

  return (
    <GlobalErrorBoundary>
      <div className="relative flex flex-row h-[calc(100vh-64px-56px)] w-full overflow-hidden">
        {/* --- Invisible logic-only components --- */}
        <UserLocationTracker />
        <MapCameraManager />
        {isRideActive && <RideSocketListener />}

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