"use client";

import React, { useState, useEffect } from "react";
import {
  RideService,
  VehicleType,
  GeoLocation,
  RideEstimate,
} from "@/services/ride.service";
import { useSession } from "next-auth/react";

export interface RideBookingProps {
  onRideCreated?: (rideId: string) => void;
  onCancel?: () => void;
}

const vehicleTypes = [
  {
    type: "BIKE" as VehicleType,
    name: "Bike",
    description: "Quick and affordable",
  },
  { type: "CAR" as VehicleType, name: "Car", description: "Comfortable ride" },
  { type: "VAN" as VehicleType, name: "Van", description: "Extra space" },
  {
    type: "LUXURY" as VehicleType,
    name: "Luxury",
    description: "Premium experience",
  },
];

const paymentMethods = [
  { id: "CASH", name: "Cash", description: "Pay with cash" },
  { id: "CARD", name: "Card", description: "Pay with card" },
  { id: "WALLET", name: "Wallet", description: "Pay from wallet" },
];

export const RideBooking: React.FC<RideBookingProps> = ({
  onRideCreated,
  onCancel,
}) => {
  const { data: session } = useSession();
  const [step, setStep] = useState<"location" | "estimate" | "booking">(
    "location",
  );

  // Location state
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupLocation, setPickupLocation] = useState<GeoLocation | null>(
    null,
  );
  const [dropoffLocation, setDropoffLocation] = useState<GeoLocation | null>(
    null,
  );

  // Estimate state
  const [estimate, setEstimate] = useState<RideEstimate | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] =
    useState<VehicleType>("CAR");
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Booking state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CARD");
  const [notes, setNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickupLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: "", // Will be filled when user types address
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  }, []);

  const handleGetEstimate = async () => {
    if (!pickupLocation || !dropoffLocation) {
      setError("Please select both pickup and dropoff locations");
      return;
    }

    setEstimateLoading(true);
    setError(null);

    try {
      const estimateData = await RideService.getEstimate({
        pickupLat: pickupLocation.latitude,
        pickupLng: pickupLocation.longitude,
        dropoffLat: dropoffLocation.latitude,
        dropoffLng: dropoffLocation.longitude,
        vehicleType: selectedVehicleType,
      });

      setEstimate(estimateData);
      setStep("estimate");
    } catch (err: any) {
      setError(err.message || "Failed to get estimate");
    } finally {
      setEstimateLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      setError("Missing location information");
      return;
    }

    setBookingLoading(true);
    setError(null);

    try {
      const response = await RideService.createRide({
        pickupLocation: {
          ...pickupLocation,
          address: pickupAddress,
        },
        dropoffLocation: {
          ...dropoffLocation,
          address: dropoffAddress,
        },
        vehicleType: selectedVehicleType,
        notes: notes || undefined,
      });

      // Redirect to payment if needed
      if (response.payment.authorizationUrl) {
        window.location.href = response.payment.authorizationUrl;
      } else {
        onRideCreated?.(response.ride.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to book ride");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleLocationSelect = async (address: string, isPickup: boolean) => {
    // In a real implementation, you'd use Google Places Autocomplete API
    // For now, we'll simulate with a simple geocoding
    if (isPickup) {
      setPickupAddress(address);
    } else {
      setDropoffAddress(address);
    }
  };

  if (step === "location") {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Book a Ride</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Pickup Location */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Pickup Location
          </label>
          <input
            type="text"
            value={pickupAddress}
            onChange={(e) => handleLocationSelect(e.target.value, true)}
            placeholder="Enter pickup address"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {pickupLocation && (
            <p className="text-xs text-gray-500 mt-1">
              Lat: {pickupLocation.latitude.toFixed(6)}, Lng:{" "}
              {pickupLocation.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Dropoff Location */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Dropoff Location
          </label>
          <input
            type="text"
            value={dropoffAddress}
            onChange={(e) => handleLocationSelect(e.target.value, false)}
            placeholder="Enter dropoff address"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dropoffLocation && (
            <p className="text-xs text-gray-500 mt-1">
              Lat: {dropoffLocation.latitude.toFixed(6)}, Lng:{" "}
              {dropoffLocation.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Vehicle Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Vehicle Type</label>
          <div className="grid grid-cols-2 gap-3">
            {vehicleTypes.map((vehicle) => (
              <button
                key={vehicle.type}
                onClick={() => setSelectedVehicleType(vehicle.type)}
                className={`p-3 border rounded-md text-left transition ${
                  selectedVehicleType === vehicle.type
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="font-medium">{vehicle.name}</div>
                <div className="text-xs text-gray-500">
                  {vehicle.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleGetEstimate}
            disabled={!pickupLocation || !dropoffLocation || estimateLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {estimateLoading ? "Loading..." : "Get Estimate"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "estimate" && estimate) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Ride Estimate</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Route Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Distance</span>
            <span className="font-medium">{estimate.distance} km</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Duration</span>
            <span className="font-medium">{estimate.duration} mins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Fare</span>
            <span className="text-xl font-bold text-blue-600">
              ₦{estimate.estimatedFare.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Payment Method
          </label>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`w-full p-3 border rounded-md text-left transition ${
                  selectedPaymentMethod === method.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="font-medium">{method.name}</div>
                <div className="text-xs text-gray-500">
                  {method.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions for the driver?"
            rows={3}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep("location")}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            onClick={handleBookRide}
            disabled={bookingLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {bookingLoading ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
