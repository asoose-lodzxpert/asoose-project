'use client';

import { RideController } from "./components/RideController";
import { MapView } from "./components/mapView";
import { UserLocationTracker } from "./components/UserLocationTracker";
import { MapCameraManager } from "./components/MapCameraManager";
import { SimulationController } from "./components/SimulationController";
import { useRideStore } from "./store/ride"; 

export default function Home() {
  const rideStatus = useRideStore((state) => state.rideStatus);

  // REPAIR: 'searching' MUST be included here.
  // Without it, the SimulationController unmounts immediately when you click "Confirm",
  // killing the timer that finds the driver.
  const isSimulationActive = [
    'searching',   // <--- CRITICAL FIX
    'confirmed', 
    'arrived',
    'in-progress'
  ].includes(rideStatus);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapView />
      <UserLocationTracker />
      <MapCameraManager />
      
      {/* Visual UI layer */}
      <RideController />
      
      {/* Logic Layer: Must be present to drive the state machine */}
      {isSimulationActive && <SimulationController />}
    </main>
  );
}