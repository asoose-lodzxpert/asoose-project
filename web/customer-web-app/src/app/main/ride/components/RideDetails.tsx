"use client";

import { useRideStore } from "../store/ride";

export function RideDetails() {
  const rideType = useRideStore((state) => state.rideType);
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setIsConfiguring = useRideStore((state) => state.setIsConfiguring);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);

  const handleConfirm = () => {
    if (isConfiguring === "pickup") {
      setIsConfiguring("dropoff");
    } else if (isConfiguring === "dropoff") {
      setRideStatus("searching");
      setIsConfiguring(null);
    }
  };

  const handleCancel = () => {
    setRideStatus("idle");
    setIsConfiguring(null);
    setPickupLocation(null);
    setDropoffLocation(null);
  };

  return (
    <div className="p-4 rounded-lg shadow-lg w-96 bg-white">
      <h2 className="text-xl font-bold mb-4">Standard Ride</h2>
      <div className="mb-4">
        {isConfiguring === "pickup" && (
          <div>
            <h3 className="font-semibold">Set Pickup Location</h3>
            {/* In a real app, this would be a map interface to select a location */}
            <input
              type="text"
              placeholder="Enter pickup location"
              className="w-full p-2 mt-2 rounded-md border border-gray-300"
              onChange={(e) => {
                // Note: This is placeholder scaffolding. In production the map
                // sets locations via setPickupLocation({ lat, lng }).
                // Text input is kept for dev convenience only; not wired up.
                void e.target.value;
              }}
            />
          </div>
        )}
        {isConfiguring === "dropoff" && (
          <div>
            <h3 className="font-semibold">Set Dropoff Location</h3>
            {/* In a real app, this would be a map interface to select a location */}
            <input
              type="text"
              placeholder="Enter dropoff location"
              className="w-full p-2 mt-2 rounded-md border border-gray-300"
              onChange={(e) => {
                // Note: This is placeholder scaffolding. In production the map
                // sets locations via setDropoffLocation({ lat, lng }).
                void e.target.value;
              }}
            />
          </div>
        )}
      </div>
      {isConfiguring && (
        <div className="flex justify-between">
          <button
            className="px-4 py-2 rounded-md bg-gray-400 hover:bg-gray-500 text-white"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      )}
      {rideStatus === "searching" && <p>Searching for a driver...</p>}
    </div>
  );
}
