"use client";

import React, { useState, useEffect } from "react";
import {
  DeliveryService,
  DeliveryAddress,
  DeliveryEstimate,
} from "@/services/delivery.service";

export interface DeliveryRequestProps {
  onDeliveryCreated?: (deliveryId: string) => void;
  onCancel?: () => void;
}

export const DeliveryRequest: React.FC<DeliveryRequestProps> = ({
  onDeliveryCreated,
  onCancel,
}) => {
  const [step, setStep] = useState<"details" | "estimate" | "booking">(
    "details",
  );

  // Sender info (simplified address for pickup)
  const [pickupAddressText, setPickupAddressText] = useState("");
  const [pickupLat, setPickupLat] = useState(0);
  const [pickupLng, setPickupLng] = useState(0);

  // Recipient info
  const [dropoffAddressText, setDropoffAddressText] = useState("");
  const [dropoffLat, setDropoffLat] = useState(0);
  const [dropoffLng, setDropoffLng] = useState(0);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Package info
  const [packageDescription, setPackageDescription] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [packageValue, setPackageValue] = useState("");
  const [fragile, setFragile] = useState(false);

  // Estimate & booking
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [notes, setNotes] = useState("");
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's current location for pickup
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickupLat(position.coords.latitude);
          setPickupLng(position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  }, []);

  const handleGetEstimate = async () => {
    if (!pickupLat || !dropoffLat) {
      setError("Please provide valid pickup and dropoff addresses");
      return;
    }

    if (!packageWeight || parseFloat(packageWeight) <= 0) {
      setError("Please enter a valid package weight");
      return;
    }

    setEstimateLoading(true);
    setError(null);

    try {
      const estimateData = await DeliveryService.getEstimate({
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        weight: parseFloat(packageWeight),
        fragile: fragile,
      });

      setEstimate(estimateData);
      setStep("estimate");
    } catch (err: any) {
      setError(err.message || "Failed to get estimate");
    } finally {
      setEstimateLoading(false);
    }
  };

  const handleCreateDelivery = async () => {
    if (!estimate) {
      setError("No estimate available");
      return;
    }

    setBookingLoading(true);
    setError(null);

    try {
      const response = await DeliveryService.createDelivery({
        pickupAddress: {
          latitude: pickupLat,
          longitude: pickupLng,
          address: pickupAddressText,
          recipientName: "", // Sender info, can be left empty or filled from user profile
          recipientPhone: "",
        },
        dropoffAddress: {
          latitude: dropoffLat,
          longitude: dropoffLng,
          address: dropoffAddressText,
          recipientName,
          recipientPhone,
        },
        packageDetails: {
          description: packageDescription,
          weight: parseFloat(packageWeight),
          value: packageValue ? parseFloat(packageValue) : undefined,
          fragile,
        },
      });

      // Redirect to payment if needed
      if (response.payment.authorizationUrl) {
        window.location.href = response.payment.authorizationUrl;
      } else {
        onDeliveryCreated?.(response.delivery.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create delivery");
    } finally {
      setBookingLoading(false);
    }
  };

  if (step === "details") {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Request Delivery</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Pickup Address */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Pickup Address</h3>
          <input
            type="text"
            value={pickupAddressText}
            onChange={(e) => setPickupAddressText(e.target.value)}
            placeholder="Enter full pickup address"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {pickupLat !== 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Lat: {pickupLat.toFixed(6)}, Lng: {pickupLng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Dropoff Address */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Delivery Address</h3>
          <input
            type="text"
            value={dropoffAddressText}
            onChange={(e) => setDropoffAddressText(e.target.value)}
            placeholder="Enter full delivery address"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Recipient Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Recipient Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Recipient name"
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="Recipient phone"
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Package Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Package Details</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
              placeholder="Package description"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(e.target.value)}
                  placeholder="Weight (kg)"
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={packageValue}
                  onChange={(e) => setPackageValue(e.target.value)}
                  placeholder="Value (₦) - Optional"
                  min="0"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={fragile}
                onChange={(e) => setFragile(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Fragile item - handle with care</span>
            </label>
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
            disabled={estimateLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {estimateLoading ? "Calculating..." : "Get Estimate"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "estimate" && estimate) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Delivery Estimate</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Distance</span>
            <span className="font-medium">{estimate.distance} km</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Est. Duration</span>
            <span className="font-medium">{estimate.duration} mins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Delivery Fee</span>
            <span className="text-xl font-bold text-blue-600">
              ₦{estimate.estimatedFee.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions for the rider?"
            rows={3}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep("details")}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            onClick={handleCreateDelivery}
            disabled={bookingLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {bookingLoading ? "Confirming..." : "Confirm Delivery"}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
