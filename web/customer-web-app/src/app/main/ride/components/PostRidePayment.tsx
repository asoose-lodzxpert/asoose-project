"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { CheckCircle2, Loader2, CreditCard, MapPin, Clock, Route } from "lucide-react";
import { useRideStore } from "../store/ride";
import { RideService } from "@/services/ride.service";

/**
 * PostRidePayment
 * ---------------
 * Floating card shown after the ride is COMPLETED but before the customer
 * has paid. Post-ride payment model — the user pays only after arriving at
 * their destination.
 *
 * Transitions:
 *   • 'finished'  — after Paystack redirect → callback verification → back
 */
export function PostRidePayment() {
  const { data: session } = useSession();

  const rideId = useRideStore((s) => s.rideId);
  const tripSummary = useRideStore((s) => s.tripSummary);
  const lockedEstimate = useRideStore((s) => s.lockedEstimate);
  const setPaymentConfirmed = useRideStore((s) => s.setPaymentConfirmed);

  const [isProcessing, setIsProcessing] = useState(false);

  // Use trip summary if available (actual fare from backend), else fall back to locked estimate
  const fare = tripSummary?.fare ?? lockedEstimate?.fare ?? 0;
  const distance = tripSummary?.distance ?? lockedEstimate?.distance ?? 0;
  const duration = tripSummary?.duration ?? lockedEstimate?.duration ?? 0;

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  // ── PAY ────────────────────────────────────────────────────────────────────
  // Calls POST /trips/rides/:id/confirm which creates a Paystack session
  // and returns { rideId, authorizationUrl, reference }.
  const handlePay = async () => {
    if (!session?.accessToken || !rideId) {
      toast.error("Unable to process payment. Please try again.");
      return;
    }

    setIsProcessing(true);
    try {
      const confirmRes = await RideService.confirmRide(
        rideId,
        "CARD",
        session.accessToken,
      );

      if (!confirmRes.authorizationUrl) {
        throw new Error(
          "Paystack authorisation URL not returned. Please try again.",
        );
      }

      // Persist ride context so the callback page can restore state on return
      localStorage.setItem("pending_ride", "true");
      localStorage.setItem("pending_ride_id", rideId);

      // Mark payment confirmed so the callback page maps COMPLETED → 'finished'
      setPaymentConfirmed(true);

      // Hard-navigate to Paystack — page will be unloaded here
      window.location.href = confirmRes.authorizationUrl;
    } catch (err: any) {
      console.error("Post-ride payment failed:", err);
      toast.error(
        err?.message || "Failed to initialise payment. Please try again.",
      );
      localStorage.removeItem("pending_ride");
      localStorage.removeItem("pending_ride_id");
      setIsProcessing(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="absolute bottom-20 md:bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-30 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="p-3 bg-green-400/20 rounded-full">
          <CheckCircle2
            className="text-green-600 dark:text-green-400"
            size={24}
          />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
            Trip Complete!
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Complete payment for your ride
          </p>
        </div>
      </div>

      {/* Trip Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
          <Route size={16} className="text-zinc-400 dark:text-zinc-500 mb-1" />
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            {distance.toFixed(1)} km
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Distance
          </span>
        </div>
        <div className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
          <Clock size={16} className="text-zinc-400 dark:text-zinc-500 mb-1" />
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            {Math.ceil(duration)} min
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Duration
          </span>
        </div>
        <div className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
          <MapPin size={16} className="text-zinc-400 dark:text-zinc-500 mb-1" />
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            Arrived
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Status
          </span>
        </div>
      </div>

      {/* Fare row */}
      <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl px-4 py-3 mb-5">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Trip Fare
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-0.5">
            Final fare · no surprise charges
          </p>
        </div>
        <span className="text-xl font-black text-zinc-900 dark:text-white ml-4">
          {formatMoney(fare)}
        </span>
      </div>

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Redirecting to Paystack…</span>
          </>
        ) : (
          <>
            <CreditCard size={18} />
            <span>
              Pay{fare ? ` · ${formatMoney(fare)}` : ""}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
