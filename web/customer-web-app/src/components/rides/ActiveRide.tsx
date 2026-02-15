"use client";

import React, { useEffect, useState, useRef } from "react";
import { RideService, Ride, RideStatus, Driver } from "@/services/ride.service";
import {
  subscribeToRideEvents,
  unsubscribeFromRideEvents,
  RideDriverAssignedEvent,
  RideStatusChangedEvent,
  DriverLocationUpdateEvent,
} from "@/services/socket.service";
import { TrackingMap, TrackingMapHandle } from "@/components/shared/TrackingMap";

export interface ActiveRideProps {
  rideId: string;
  token?: string; 
  onRideCompleted?: () => void;
  onRideCancelled?: () => void;
}

export const ActiveRide: React.FC<ActiveRideProps> = ({
  rideId,
  token,
  onRideCompleted,
  onRideCancelled,
}) => {
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pickupOtp, setPickupOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const trackingMapRef = useRef<TrackingMapHandle>(null);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const rideData = await RideService.getCurrentRide(token);
        if (rideData) {
          setRide(rideData);
          if (rideData.driver) {
            setDriver(rideData.driver);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch ride details");
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [rideId, token]);

  useEffect(() => {
    subscribeToRideEvents(rideId, {
      onDriverAssigned: (data: RideDriverAssignedEvent) => {
        setDriver(data.driver);
        setRide((prev) =>
          prev
            ? { ...prev, status: "ACCEPTED" as RideStatus, driver: data.driver }
            : null,
        );
        
        if (data.driver.location) {
            trackingMapRef.current?.updateDriverCoordinates(
                data.driver.location.latitude,
                data.driver.location.longitude,
                data.driver.location.heading
            );
        }
      },

      onStatusChanged: (data: RideStatusChangedEvent) => {
        setRide((prev) => (prev ? { ...prev, status: data.status } : null));

        if (data.status === "COMPLETED") {
          onRideCompleted?.();
        } else if (data.status === "CANCELLED") {
          onRideCancelled?.();
        }
      },

      onDriverLocationUpdate: (data: DriverLocationUpdateEvent) => {
        trackingMapRef.current?.updateDriverCoordinates(
            data.location.latitude,
            data.location.longitude,
            data.location.heading
        );
      },

      onDriverArrived: () => {
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
      await RideService.cancelRide(rideId, "User requested cancellation", token);
      setShowCancelConfirm(false);
      onRideCancelled?.();
    } catch (err: any) {
      setError(err.message || "Failed to cancel ride");
    } finally {
      setCancelling(false);
    }
  };

  const handleVerifyOtp = async () => {
     // implementation depends on the service method
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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

  const mapUserLocation = { 
    latitude: ride.pickupAddress?.lat || 0, 
    longitude: ride.pickupAddress?.lng || 0 
  };
  
  const mapDropoffLocation = { 
    latitude: ride.dropoffAddress?.lat || 0, 
    longitude: ride.dropoffAddress?.lng || 0 
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Map rendered imperatively through the ref handle */}
      <div className="mb-6">
        <TrackingMap
          ref={trackingMapRef}
          userLocation={mapUserLocation}
          driverLocation={ride.driver?.location}
          pickupLocation={mapUserLocation}
          destinationLocation={mapDropoffLocation}
          showRoute={ride.status === "ACCEPTED" || ride.status === "IN_PROGRESS"}
          height="400px"
          autoCenterOnDriver={ride.status === "ACCEPTED"}
          rideStage={ride.status}
        />
      </div>

      {driver && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-3">Driver Information</h3>
          <div className="flex items-center gap-4">
            {driver.image && (
              <img src={driver.image} alt={driver.name} className="w-16 h-16 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <p className="font-medium text-lg">{driver.name}</p>
              <p className="text-sm text-gray-600">{driver.vehicleNumber || driver.vehicle?.plateNumber}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm">{driver.rating?.toFixed(1) || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-3">Ride Details</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Pickup</p>
            <p className="font-medium">{ride.pickupAddress?.addressText}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Dropoff</p>
            <p className="font-medium">{ride.dropoffAddress?.addressText}</p>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Fare</span>
            <span className="font-bold text-lg">
              ₦{(ride.actualFare || ride.estimatedFare || ride.totalFare || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};