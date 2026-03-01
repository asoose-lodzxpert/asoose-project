"use client";

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

export default function Home() {
  const { data: session } = useSession();
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const rideId = useRideStore((state) => state.rideId);

  // Socket is managed globally by SocketProvider in providers.tsx (C4 fix).
  // It connects on authentication and stays alive across page navigation and
  // Paystack redirects, only disconnecting on logout.

  // Activate State Recovery
  useRideSynchronization();

  const isRideActive = [
    "searching",
    "confirmed",
    "arrived",
    "in-progress",
    "payment-required",
  ].includes(rideStatus);

  // Sidebar-hosted states: idle (RideSelection) and configuring (LocationSelector)
  const showSidebar = rideStatus === "idle" || isConfiguring;

  return (
    <GlobalErrorBoundary>
      {/* h-[calc(100dvh-64px)]: dvh = dynamic viewport height (fixes iOS Safari 100vh bug).
           BottomNav is `fixed` so it doesn't participate in document flow — no need to
           subtract its height here. On mobile the BottomNav overlaps the page; floating
           panels use bottom-20 to clear it. */}
      <div className="relative flex flex-row h-[calc(100dvh-64px)] w-full overflow-hidden">
        {/* --- Invisible logic-only components --- */}
        <UserLocationTracker />
        <MapCameraManager />
        {/* Mount socket listener as soon as we have a rideId to prevent race
            conditions where rapid backend events arrive before REST API completes.
            The socket listener internally guards all events with rideId matching. */}
        {rideId && <RideSocketListener />}

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
