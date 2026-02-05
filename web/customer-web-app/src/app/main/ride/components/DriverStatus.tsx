"use client";

import React from "react";
import {
  Phone,
  MessageSquare,
  ChevronDown,
  ShieldAlert,
  MapPin,
  Star,
} from "lucide-react";

export type TripStatus = "ON_WAY" | "ARRIVED";

interface DriverStatusUIProps {
  status: TripStatus;
  etaMinutes?: number;
  driver: any;
  tripDetails: any;
  onCancel: () => void;
}

export default function DriverStatusUI({
  status,
  etaMinutes = 3,
  driver,
  tripDetails,
}: DriverStatusUIProps) {
  return (
    <div className="h-full flex flex-col justify-between pointer-events-none md:pointer-events-auto font-sans relative transition-colors duration-300">
      {/* --- DRIVER ON WAY BANNER --- */}
      {status === "ON_WAY" && (
        <div className="pointer-events-auto mx-4 mt-4 animate-in slide-in-from-top-10 fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 flex items-center justify-between border dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Driver is on the way
              </h2>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                Arriving in {etaMinutes} minutes
              </p>
            </div>
            <button className="bg-red-500 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all">
              <ShieldAlert size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* --- BOTTOM SHEET --- */}
      <div
        className="
        pointer-events-auto bg-white dark:bg-[#0a0a0a] rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] 
        dark:shadow-none pb-8 pt-2 relative animate-in slide-in-from-bottom-20 duration-500
        md:rounded-3xl md:m-4 md:shadow-2xl border-t dark:border-zinc-800 md:border
      "
      >
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mt-3 mb-6" />

        <div className="px-6">
          {status === "ARRIVED" && (
            <div className="text-center mb-6 animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mb-1">
                Driver has arrived!
              </h2>
              <p className="text-gray-500 dark:text-zinc-500 text-sm">
                Your ride is ready
              </p>
            </div>
          )}

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shrink-0 border-2 border-white dark:border-zinc-800 shadow-sm">
              {driver.name.charAt(0)}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {driver.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                    {driver.rating}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">
                    ({driver.trips} trips)
                  </span>
                </div>
              </div>

              <div className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
                {driver.vehicle} <span className="mx-1">•</span>{" "}
                <span className="font-bold text-gray-900 dark:text-zinc-200">
                  {driver.plate || "KJA-123"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <Phone size={18} /> Call
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <MessageSquare size={18} /> Message
            </button>
          </div>

          {status === "ARRIVED" ? (
            <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-4 flex items-center gap-3 mb-4 border dark:border-zinc-800">
              <MapPin size={20} className="text-red-500 fill-red-500" />
              <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                Driver is waiting at{" "}
                <span className="text-gray-900 dark:text-white">
                  {tripDetails.pickup.split(",")[0]}
                </span>
              </p>
            </div>
          ) : (
            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-900 dark:text-white">
                  Trip Details
                </span>
                <ChevronDown
                  size={18}
                  className="text-gray-400 dark:text-zinc-600"
                />
              </div>
              <div className="flex flex-col gap-4 relative pl-2">
                <div className="absolute left-[9px] top-2 bottom-6 w-0.5 bg-gray-200 dark:bg-zinc-800" />
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-[5px] border-emerald-500 z-10" />
                  <span className="text-sm font-medium text-gray-600 dark:text-zinc-400 truncate">
                    {tripDetails.pickup}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-[5px] border-red-500 z-10" />
                  <span className="text-sm font-medium text-gray-600 dark:text-zinc-400 truncate">
                    {tripDetails.dropoff}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
