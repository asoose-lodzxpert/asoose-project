"use client";

import React, { useEffect, useState } from "react";
import { RideService, Ride, RideStatus, Driver } from "@/services/ride.service";
import {
  subscribeToRideEvents,
  unsubscribeFromRideEvents,
  RideDriverAssignedEvent,
  RideStatusChangedEvent,
  DriverLocationUpdateEvent,
} from "@/services/socket.service";
import { TrackingMap, MapLocation } from "@/components/shared/TrackingMap";

export interface ActiveRideProps {
  rideId: string;
  onRideCompleted?: () => void;
  onRideCancelled?: () => void;
}

export const ActiveRide: React.FC<ActiveRideProps> = ({
  rideId,
  onRideCompleted,
  onRideCancelled,
}) => {
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<MapLocation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pickupOtp, setPickupOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const rideData = await RideService.getCurrentRide();
        if (rideData) {
          setRide(rideData);
          if (rideData.driver) {
            setDriver(rideData.driver);
          }
          if (rideData.driver?.location) {
            setDriverLocation(rideData.driver.location);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch ride details");
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [rideId]);

  // Subscribe to real-time ride updates
  useEffect(() => {
    subscribeToRideEvents(rideId, {
      onDriverAssigned: (data: RideDriverAssignedEvent) => {
        console.log("Driver assigned:", data);
        setDriver(data.driver);
        setDriverLocation(data.driver.location);
        setRide((prev) =>
          prev
            ? { ...prev, status: "ACCEPTED" as RideStatus, driver: data.driver }
            : null,
        );
      },

      onStatusChanged: (data: RideStatusChangedEvent) => {
        console.log("Status changed:", data);
        setRide((prev) => (prev ? { ...prev, status: data.status } : null));

        if (data.status === "COMPLETED") {
          onRideCompleted?.();
        } else if (data.status === "CANCELLED") {
          onRideCancelled?.();
        }
      },

      onDriverLocationUpdate: (data: DriverLocationUpdateEvent) => {
        console.log("Driver location updated:", data);
        setDriverLocation(data.location);
      },

      onDriverArrived: () => {
        console.log("Driver arrived");
        setRide((prev) =>
          prev ? { ...prev, status: "IN_PROGRESS" as RideStatus } : null,
        );
      },
    });

    return () => {
      unsubscribeFromRideEvents(rideId);
    };
  }, [rideId, onRideCompleted, onRideCancelled]);

  const handleCancelRide = async () => {
    setCancelling(true);
    setError(null);

    try {
      await RideService.cancelRide(rideId);
      setShowCancelConfirm(false);
      onRideCancelled?.();
    } catch (err: any) {
      setError(err.message || "Failed to cancel ride");
    } finally {
      setCancelling(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!pickupOtp || pickupOtp.length !== 4) {
      setError("Please enter a valid 4-digit OTP");
      return;
    }

    setVerifyingOtp(true);
    setError(null);

    try {
      await RideService.verifyPickupOtp(rideId, pickupOtp);
      setPickupOtp("");
      // Status will be updated via socket event
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">No active ride found</p>
      </div>
    );
  }

  const getStatusText = () => {
    switch (ride.status) {
      case "REQUESTED":
        return "Finding a driver...";
      case "ACCEPTED":
        return "Driver on the way";
      case "IN_PROGRESS":
        return "In progress";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return ride.status;
    }
  };

  const getStatusColor = () => {
    switch (ride.status) {
      case "REQUESTED":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-4">
        <span
          className={`inline-block px-4 py-2 rounded-full font-medium ${getStatusColor()}`}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Map */}
      <div className="mb-6">
        <TrackingMap
          userLocation={ride.pickupLocation}
          driverLocation={driverLocation || undefined}
          pickupLocation={ride.pickupLocation}
          destinationLocation={ride.dropoffLocation}
          showRoute={!!driverLocation}
          height="400px"
          autoCenterOnDriver={ride.status === "ACCEPTED"}
        />
      </div>

      {/* Driver Info */}
      {driver && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-3">Driver Information</h3>
          <div className="flex items-center gap-4">
            {driver.image && (
              <img
                src={driver.image}
                alt={driver.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-lg">{driver.name}</p>
              <p className="text-sm text-gray-600">{driver.vehicleNumber}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm">
                  {driver.rating?.toFixed(1) || "N/A"}
                </span>
              </div>
            </div>
            <a
              href={`tel:${driver.phone}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Call
            </a>
          </div>
        </div>
      )}

      {/* Ride Details */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-3">Ride Details</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Pickup</p>
            <p className="font-medium">{ride.pickupLocation.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Dropoff</p>
            <p className="font-medium">{ride.dropoffLocation.address}</p>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Fare</span>
            <span className="font-bold text-lg">
              ₦{(ride.actualFare || ride.estimatedFare).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Payment</span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                ride.paymentStatus === "PAID"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {ride.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* OTP Verification (when driver arrives) */}
      {ride.status === "ACCEPTED" && driver && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold mb-3">Verify Pickup</h3>
          <p className="text-sm text-gray-700 mb-3">
            When the driver arrives, enter the 4-digit OTP they provide
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={pickupOtp}
              onChange={(e) =>
                setPickupOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="Enter OTP"
              maxLength={4}
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={verifyingOtp || pickupOtp.length !== 4}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {verifyingOtp ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Ride Button */}
      {ride.status !== "COMPLETED" && ride.status !== "CANCELLED" && (
        <div>
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full px-4 py-3 border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition"
            >
              Cancel Ride
            </button>
          ) : (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 mb-3">
                Are you sure you want to cancel this ride? Cancellation fees may
                apply.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Keep Ride
                </button>
                <button
                  onClick={handleCancelRide}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
