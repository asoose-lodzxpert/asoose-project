'use client';

import { RideController } from "./components/RideController";
import { MapView } from "./components/mapView";
import { UserLocationTracker } from "./components/UserLocationTracker";
import { MapCameraManager } from "./components/MapCameraManager";
import { SimulationController } from "./components/SimulationController";
import { useRideStore } from "./store/ride"; 
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { RideSafetyControls } from "./components/RideSafetyControls";

export default function Home() {
  const rideStatus = useRideStore((state) => state.rideStatus);

  // REPAIR: 'searching' MUST be included here.
  const isSimulationActive = [
    'searching',
    'confirmed', 
    'arrived',
    'in-progress'
  ].includes(rideStatus);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* 1. Global Safety & Error Layer */}
      <GlobalErrorBanner />
      <RideSafetyControls />

      {/* 2. Logic Layer */}
      <UserLocationTracker />
      <MapCameraManager />
      {isSimulationActive && <SimulationController />}

      {/* 3. Base Map Layer */}
      <MapView />
      
      {/* 4. Visual UI Layer (Absolute positioning handled internally) */}
      <RideController />
    </main>
  );
}