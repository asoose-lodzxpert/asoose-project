"use client";

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
import { Suspense } from "react";

export default function Home() {
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const rideId = useRideStore((state) => state.rideId);

  // Socket is managed globally by SocketProvider in providers.tsx (C4 fix).
  // It connects on authentication and stays alive across page navigation and
  // Paystack redirects, only disconnecting on logout.

  // Activate State Recovery
  useRideSynchronization();

  // Sidebar-hosted states: idle (RideSelection) and configuring (LocationSelector)
  const showSidebar = rideStatus === "idle" || isConfiguring;

  return (
    <GlobalErrorBoundary>
      {/* h-[calc(100dvh-64px)]: dvh = dynamic viewport height (fixes iOS Safari 100vh bug).
           BottomNav is `fixed` so it doesn't participate in document flow — no need to
           subtract its height here. On mobile the BottomNav overlaps the page; floating
           panels use bottom-20 to clear it. */}
      <div className="relative flex h-[calc(100dvh-64px-68px)] w-full flex-row overflow-hidden md:h-[calc(100dvh-64px)]">
        {/* --- Invisible logic-only components --- */}
        <UserLocationTracker />
        <MapCameraManager />
        {/* Mount socket listener as soon as we have a rideId to prevent race
            conditions where rapid backend events arrive before REST API completes.
            The socket listener internally guards all events with rideId matching. */}
        {rideId && <RideSocketListener />}

        {/* --- Sidebar (left column, only for idle/configuring) --- */}
        {showSidebar && (
          <div
            className={`z-30 flex-shrink-0 overflow-hidden bg-white dark:bg-zinc-900 md:static md:h-full md:w-[450px] md:min-w-[450px] md:max-w-md md:rounded-none ${
              isConfiguring
                ? "absolute inset-x-0 bottom-0 h-[62%] rounded-t-[2rem] border-t border-black/5 shadow-[0_-20px_60px_-24px_rgba(0,0,0,0.35)] dark:border-white/10"
                : "h-full w-full max-w-md"
            }`}
          >
            <Sidebar>
              <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading ride details...</div>}>
                <RideController />
              </Suspense>
            </Sidebar>
          </div>
        )}

        {/* --- Map (fills remaining space) --- */}
        <div className="relative h-full w-full flex-1">
          <MapView />

          {/* --- Floating overlays (positioned over the map) --- */}
          <GlobalErrorBanner />
          <RideSafetyControls />

          {/* --- Ride-state floating panels (searching, confirmed, arrived, in-progress, finished) --- */}
          {!showSidebar && (
            <Suspense fallback={null}>
              <RideController />
            </Suspense>
          )}
        </div>
      </div>
    </GlobalErrorBoundary>
  );
}
