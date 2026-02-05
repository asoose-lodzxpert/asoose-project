"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Loader2,
  FileText,
  Clock,
  Star,
  CreditCard,
  CheckCircle,
  MapPin,
  RefreshCw,
  UserPlus,
  UserMinus,
} from "lucide-react";
import Swal from "sweetalert2";
import useSWR from "swr";
import { getSession } from "next-auth/react";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import RideDetailSkeleton from "./skeleton";
import DriverSelectorModal from "./component/DriverSelectorModal";

// Matches Backend DTO
interface RideDetail {
  id: string;
  status: string;
  date: string;
  pickup: {
    address: string;
    time: string;
    coords: { lat: number; lng: number };
  };
  dropoff: {
    address: string;
    time: string;
    coords: { lat: number; lng: number };
  };
  driver: {
    name: string;
    id: string;
    phone: string;
    rating: number;
    image: string;
    vehicle: string;
    plate: string;
  } | null;
  passenger: {
    name: string;
    id: string;
    phone: string;
    rating: number;
    image: string;
  };
  fare: {
    base: string;
    distance: string;
    time: string;
    discount: string;
    total: string;
    method: string;
  };
  timeline: { status: string; time: string; done: boolean; active?: boolean }[];
  logs?: { action: string; performedBy: string; date: string }[];
}

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // State for Modals & Loading
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Data Fetching
  const {
    data: ride,
    error,
    isLoading,
    mutate,
  } = useSWR<RideDetail>(id ? `/super-admin/rides/${id}` : null, fetcher, {
    refreshInterval: 5000, // Live updates
    shouldRetryOnError: false,
  });

  // Helper to get Token
  const getAuthToken = async () => {
    const session = await getSession();
    return (session as any)?.accessToken;
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // ===========================================================================
  //  ACTIONS
  // ===========================================================================

  // Feature 1: Retry Matching
  const handleRetryMatching = async () => {
    const result = await Swal.fire({
      title: "Retry Matching?",
      text: "This will restart the driver search. Ensure the user has paid.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      confirmButtonText: "Yes, Retry",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      setIsRetrying(true);
      try {
        const token = await getAuthToken();
        const res = await fetch(
          `${API_URL}/super-admin/rides/${id}/retry-matching`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) throw new Error("Failed to retry matching");

        Swal.fire({
          title: "Queued",
          text: "Matching restarted successfully",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
          timer: 1500,
          showConfirmButton: false,
        });
        mutate();
      } catch (err: any) {
        Swal.fire({
          title: "Error",
          text: err.message,
          icon: "error",
          background: "#1E293B",
          color: "#fff",
        });
      } finally {
        setIsRetrying(false);
      }
    }
  };

  // Feature 2: Manual Assign
  const handleManualAssign = async (riderId: string) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/super-admin/rides/${id}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ riderId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Assignment failed");

      Swal.fire({
        title: "Assigned",
        text: "Driver successfully assigned.",
        icon: "success",
        background: "#1E293B",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });
      mutate();
    } catch (err: any) {
      Swal.fire({
        title: "Error",
        text: err.message,
        icon: "error",
        background: "#1E293B",
        color: "#fff",
      });
    }
  };

  // Feature 2: Unassign (Reversal)
  const handleUnassign = async () => {
    const result = await Swal.fire({
      title: "Unassign Driver?",
      text: "The ride will return to 'SEARCHING' status.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, Unassign",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/super-admin/rides/${id}/unassign`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Unassign failed");

        Swal.fire({
          title: "Unassigned",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
          timer: 1000,
          showConfirmButton: false,
        });
        mutate();
      } catch (err: any) {
        Swal.fire({
          title: "Error",
          text: err.message,
          icon: "error",
          background: "#1E293B",
          color: "#fff",
        });
      }
    }
  };

  // Cancel Ride
  const handleCancelRide = async () => {
    const result = await Swal.fire({
      title: "Cancel Ride?",
      text: "This will stop the trip immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Cancel",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/super-admin/rides/${id}/cancel`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Cancel failed");

        Swal.fire({
          title: "Cancelled",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
          timer: 1500,
          showConfirmButton: false,
        });
        mutate();
      } catch (err) {
        Swal.fire({
          title: "Error",
          text: "Could not cancel ride.",
          icon: "error",
          background: "#1E293B",
          color: "#fff",
        });
      }
    }
  };

  if (isLoading) return <RideDetailSkeleton />;
  if (error || !ride)
    return <div className="p-10 text-center text-white">Ride not found</div>;

  // Status Checks
  const isActive = [
    "IN_PROGRESS",
    "REQUESTED",
    "SEARCHING",
    "ACCEPTED",
    "ARRIVED",
  ].includes(ride.status);
  const isPaid = ride.fare.method !== "N/A"; // Simple check, adjust based on actual DTO

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
        {/* HEADER & ACTIONS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link
              href="/super-admin/rides"
              className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Rides
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Ride Details
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                  ride.status === "COMPLETED"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : ride.status === "CANCELLED"
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-blue-500/10 text-blue-500 border-blue-500/20 border"
                }`}
              >
                {ride.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-gray-400 text-sm font-mono mt-1">
              ID: {ride.id} • {ride.date}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Feature 1: Retry Matching (Only if Active, Paid, No Driver) */}
            {isActive && !ride.driver && isPaid && (
              <button
                onClick={handleRetryMatching}
                disabled={isRetrying}
                className="px-3 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2 font-bold text-sm disabled:opacity-50"
              >
                {isRetrying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Retry Matching
              </button>
            )}

            {/* Feature 2: Manual Assign (Only if Active, No Driver) */}
            {isActive && !ride.driver && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-3 py-2 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-lg hover:bg-purple-500 hover:text-white transition-colors flex items-center gap-2 font-bold text-sm"
              >
                <UserPlus className="w-4 h-4" /> Manual Assign
              </button>
            )}

            {/* Feature 2: Unassign (Only if Active, Driver Exists) */}
            {isActive && ride.driver && (
              <button
                onClick={handleUnassign}
                className="px-3 py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-lg hover:bg-orange-500 hover:text-white transition-colors flex items-center gap-2 font-bold text-sm"
              >
                <UserMinus className="w-4 h-4" /> Unassign
              </button>
            )}

            {/* Cancel Action */}
            {isActive && (
              <button
                onClick={handleCancelRide}
                className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 font-bold text-sm"
              >
                <Ban className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Trip Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map / Addresses */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-full opacity-10 bg-gradient-to-l from-blue-500 to-transparent pointer-events-none"></div>
              <div className="relative z-10 space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-500/20"></div>
                    <div className="w-0.5 h-12 bg-gray-700"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                      Pickup • {ride.pickup.time}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                      {ride.pickup.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-500/20"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                      Dropoff • {ride.dropoff.time}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                      {ride.dropoff.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ride Timeline */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" /> Trip Timeline
              </h3>
              <div className="space-y-6 relative border-l-2 border-gray-700 ml-3 pl-8">
                {ride.timeline.map((step, i) => (
                  <div key={i} className="relative">
                    <div
                      className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-[#1E293B] z-10 
                            ${step.active ? "border-blue-500 text-blue-500" : step.done ? "border-green-500 text-green-500" : "border-gray-600 text-gray-600"}`}
                    >
                      {step.active ? (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                      ) : step.done ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      ) : null}
                    </div>
                    <div className="flex justify-between items-start">
                      <h4
                        className={`text-sm font-bold ${step.active ? "text-blue-400" : step.done ? "text-gray-200" : "text-gray-500"}`}
                      >
                        {step.status}
                      </h4>
                      <span className="text-xs text-gray-500 font-mono">
                        {step.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Logs */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" /> Admin Logs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-[#0F172A] border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Performed By</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {ride.logs?.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-white font-medium">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {log.performedBy}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono">
                          {new Date(log.date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(!ride.logs || ride.logs.length === 0) && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-500 italic"
                        >
                          No admin actions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Entities */}
          <div className="lg:col-span-1 space-y-6">
            {/* Driver Card */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase">
                  Driver
                </h3>
                {ride.driver && (
                  <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded">
                    Assigned
                  </span>
                )}
              </div>
              {ride.driver ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={ride.driver.image || "/rider.svg"}
                      alt="Driver"
                      className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover"
                    />
                    <div>
                      <Link
                        href={`/super-admin/users/riders/${ride.driver.id}`}
                        className="text-white font-bold hover:text-blue-400 transition-colors"
                      >
                        {ride.driver.name}
                      </Link>
                      <div className="flex items-center gap-1 text-yellow-500 text-xs">
                        <Star className="w-3 h-3 fill-yellow-500" />{" "}
                        {ride.driver.rating}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm bg-[#0F172A] p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vehicle</span>
                      <span className="text-white font-medium">
                        {ride.driver.vehicle}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plate</span>
                      <span className="text-white font-mono bg-gray-700 px-1.5 rounded text-xs">
                        {ride.driver.plate}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-700">
                      <span className="text-gray-500">Phone</span>
                      <span className="text-blue-400">{ride.driver.phone}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 bg-[#0F172A] rounded-xl border border-dashed border-gray-700">
                  <Loader2 className="w-6 h-6 text-yellow-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">
                    Searching for driver...
                  </p>
                </div>
              )}
            </div>

            {/* Passenger Card */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase">
                  Passenger
                </h3>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={ride.passenger.image || "/profile.jpg"}
                  alt="Passenger"
                  className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover"
                />
                <div>
                  <Link
                    href={`/super-admin/users/customers/${ride.passenger.id}`}
                    className="text-white font-bold hover:text-blue-400 transition-colors"
                  >
                    {ride.passenger.name}
                  </Link>
                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                    <Star className="w-3 h-3 fill-yellow-500" />{" "}
                    {ride.passenger.rating}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm bg-[#0F172A] p-3 rounded-xl">
                <span className="text-gray-500">Contact</span>
                <span className="text-blue-400">{ride.passenger.phone}</span>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">
                Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Base Fare</span>
                  <span className="text-white">{ride.fare.base}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance</span>
                  <span className="text-white">{ride.fare.distance}</span>
                </div>
                <div className="flex justify-between text-green-500">
                  <span>Discount</span>
                  <span>{ride.fare.discount}</span>
                </div>
                <div className="border-t border-gray-700 pt-3 mt-2 flex justify-between items-center">
                  <span className="text-white font-bold text-lg">Total</span>
                  <span className="text-yellow-500 font-black text-xl">
                    {ride.fare.total}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-400">
                <CreditCard className="w-3 h-3" /> Paid via {ride.fare.method}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Assignment Modal */}
      <DriverSelectorModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleManualAssign}
      />
    </div>
  );
}
