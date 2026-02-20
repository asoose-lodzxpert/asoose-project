"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { VehicleCard } from "./vechilecard";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch"; // ✅ Standardized Fetcher

// Dynamic import for the Map component
const RiderMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-800 animate-pulse flex items-center justify-center text-gray-500 text-sm font-sans">
      Loading Map...
    </div>
  ),
});

export const RiderOverviewTab = ({
  rider,
  onRefresh,
  basePath = "riders",
}: {
  rider: any;
  onRefresh: () => void;
  basePath?: string;
}) => {
  const perf = rider.performance || {
    acceptanceRate: 0,
    cancellationRate: 0,
    hoursOnline: 0,
  };

  // Live Location State
  const [position, setPosition] = useState<[number, number]>([
    rider.currentLat || 6.5244,
    rider.currentLng || 3.3792,
  ]);
  const [lastSeen, setLastSeen] = useState(rider.lastSeen);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===========================================================================
  //  ✅ FIXED POLLING LOGIC
  // ===========================================================================
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setIsRefreshing(true);

        // ✅ Use fetcher with a relative path.
        // This avoids /api duplication and automatically handles the port 3001 base URL.
        const data = await fetcher(`/super-admin/${basePath}/${rider.id}`);

        if (data && data.currentLat && data.currentLng) {
          setPosition([data.currentLat, data.currentLng]);
          setLastSeen(data.lastSeen);
        }
      } catch (err) {
        console.error("Location poll failed:", err);
      } finally {
        setIsRefreshing(false);
      }
    };

    const interval = setInterval(fetchLocation, 15000); // Poll every 15s for stability
    return () => clearInterval(interval);
  }, [rider.id]);

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] p-5 rounded-xl border border-gray-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
              Total Trips
            </p>
            <span className="text-2xl font-bold text-white mt-1 block">
              {perf.totalTrips || 0}
            </span>
          </div>
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] p-5 rounded-xl border border-gray-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
              Completion Rate
            </p>
            <span className="text-2xl font-bold text-white mt-1 block">
              {perf.completionRate || 0}%
            </span>
          </div>
          <div className="p-2.5 bg-green-500/10 rounded-lg text-green-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] p-5 rounded-xl border border-gray-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
              Cancellation Rate
            </p>
            <span className="text-2xl font-bold text-white mt-1 block">
              {perf.cancellationRate || 0}%
            </span>
          </div>
          <div className="p-2.5 bg-red-500/10 rounded-lg text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Map & Vehicle Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Map View */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden h-[380px] relative flex flex-col shadow-lg">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#1E293B]">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-tight">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Live Tracking
              {isRefreshing && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              )}
            </h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${lastSeen ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}
              />
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                {lastSeen
                  ? `Last Seen: ${new Date(lastSeen).toLocaleTimeString()}`
                  : "Connection Lost"}
              </span>
            </div>
          </div>
          <div className="flex-1 relative z-0">
            {/* Passes array [lat, lng] to the Leaflet/Google Map wrapper */}
            <RiderMap pos={position} />
          </div>
        </div>

        {/* Editable Vehicle Information */}
        <div className="h-full">
          <VehicleCard
            vehicle={rider.vehicle}
            riderId={rider.id}
            onUpdate={onRefresh}
            basePath={basePath}
          />
        </div>
      </div>
    </div>
  );
};
