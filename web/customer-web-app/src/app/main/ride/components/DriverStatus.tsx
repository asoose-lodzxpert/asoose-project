"use client";

import { Phone, MessageSquare, ShieldAlert, Star, KeyRound, Loader2 } from "lucide-react";
import { PageView, Driver } from "@/services/ride.service";

interface DriverStatusUIProps {
  status: PageView;
  driver?: Driver;
  // UPDATE: Added 'price' to the type definition
  tripDetails?: { 
    pickup: string; 
    dropoff: string;
    price?: number; 
  };
  onCancel: () => void;
  otp?: string;
  etaMinutes?: number;
}

export default function DriverStatusUI({
  status,
  etaMinutes = 3,
  driver,
  tripDetails,
  onCancel,
  otp,
}: DriverStatusUIProps) {

  // DEFENSIVE GUARD: Render a loading state if driver data hasn't arrived yet
  if (!driver) {
    return (
      <div className="h-full flex flex-col justify-end pb-8">
        <div className="bg-white dark:bg-[#0a0a0a] rounded-t-3xl shadow-2xl p-8 text-center border-t dark:border-zinc-800">
           <Loader2 className="animate-spin mx-auto mb-4 text-emerald-500" size={32} />
           <h3 className="font-bold text-lg dark:text-white">Connecting to your driver...</h3>
           <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">Getting vehicle details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-between pointer-events-none md:pointer-events-auto font-sans relative transition-colors duration-300">
      {/* --- OTP & STATUS BANNER --- */}
      <div className="pointer-events-auto mx-4 mt-4 space-y-2 animate-in slide-in-from-top-10 fade-in duration-500">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 flex items-center justify-between border dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {status === "ARRIVED" ? "Driver has arrived" : "Driver is on the way"}
            </h2>
            <div className="flex gap-2 items-center">
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                {status === "ARRIVED" ? "Ready to go" : `Arriving in ${etaMinutes} minutes`}
              </p>
              {/* Optional: Display Price if available */}
              {tripDetails?.price && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  • ₦{tripDetails.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button onClick={onCancel} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded-full hover:bg-red-100 transition-colors">
            <ShieldAlert size={20} />
          </button>
        </div>

        {/* Security OTP Card */}
        {otp && (
          <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyRound className="opacity-80" size={20} />
              <span className="text-sm font-medium">Security OTP</span>
            </div>
            <span className="text-2xl font-black tracking-widest">{otp}</span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* --- BOTTOM SHEET --- */}
      <div className="pointer-events-auto bg-white dark:bg-[#0a0a0a] rounded-t-3xl shadow-2xl pb-8 pt-2 relative border-t dark:border-zinc-800">
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mt-3 mb-6" />

        <div className="px-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shrink-0 uppercase">
              {driver.name ? driver.name.charAt(0) : "?"}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{driver.name || "Driver"}</h3>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">{driver.rating || "5.0"}</span>
                </div>
              </div>

              {/* Defensive check for vehicle data */}
              {driver.vehicle ? (
                <div className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
                  {driver.vehicle.color} {driver.vehicle.brand} {driver.vehicle.model} <span className="mx-1">•</span>{" "}
                  <span className="font-bold text-gray-900 dark:text-zinc-200">{driver.vehicle.plateNumber}</span>
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-500 mt-1">Vehicle details hidden</div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <a href={`tel:${driver.phone || ""}`} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <Phone size={18} /> Call
            </a>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <MessageSquare size={18} /> Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}