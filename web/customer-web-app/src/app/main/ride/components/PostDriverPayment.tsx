"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { CheckCircle2, Phone, Loader2, X, CreditCard } from "lucide-react";
import { useRideStore } from "../store/ride";
import { RideService } from "@/services/ride.service";

/**
 * PostDriverPayment
 * -----------------
 * Floating card shown when a driver has been assigned (DRIVER_ACCEPTED) but
 * the user has not yet paid. Matches the FindingDriver floating card style.
 *
 * Transitions:
 *   • 'confirmed'  — after Paystack redirect → callback verification → back
 *   • 'idle'       — after cancellation
 */
export function PostDriverPayment() {
  const { data: session } = useSession();

  const driver = useRideStore((s) => s.driver);
  const rideId = useRideStore((s) => s.rideId);
  const lockedEstimate = useRideStore((s) => s.lockedEstimate);
  const setRideStatus = useRideStore((s) => s.setRideStatus);
  const setPaymentConfirmed = useRideStore((s) => s.setPaymentConfirmed);
  const setRideId = useRideStore((s) => s.setRideId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

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
        window.location.origin,
      );

      if (!confirmRes.authorizationUrl) {
        throw new Error(
          "Paystack authorisation URL not returned. Please try again.",
        );
      }

      // Persist ride context so the callback page can restore state on return
      localStorage.setItem("pending_ride", "true");
      localStorage.setItem("pending_ride_id", rideId);

      // Mark payment confirmed so the sync hook maps ACCEPTED → 'confirmed' on return
      setPaymentConfirmed(true);

      // Hard-navigate to Paystack — page will be unloaded here
      window.location.href = confirmRes.authorizationUrl;
    } catch (err: any) {
      console.error("Ride confirm/payment failed:", err);
      toast.error(
        err?.message || "Failed to initialise payment. Please try again.",
      );
      localStorage.removeItem("pending_ride");
      localStorage.removeItem("pending_ride_id");
      setIsProcessing(false);
    }
  };

  // ── CANCEL ─────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!rideId || isCancelling) return;
    setIsCancelling(true);
    let cancelled = false;
    try {
      await RideService.cancelRide(
        rideId,
        "Customer cancelled before payment",
        session?.accessToken,
      );
      cancelled = true;
    } catch (err: any) {
      const httpStatus = err?.status ?? err?.response?.status;
      if (httpStatus === 404 || httpStatus === 409) {
        cancelled = true;
      } else {
        console.error("Cancel failed:", err);
        toast.error(err?.message || "Failed to cancel ride. Please try again.");
      }
    } finally {
      setIsCancelling(false);
    }

    if (cancelled) {
      toast.info("Ride cancelled.");
      setPaymentConfirmed(false);
      setRideId(null);
      setRideStatus("idle");
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
            Driver Assigned!
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Complete payment to confirm your ride
          </p>
        </div>
      </div>

      {/* Driver info */}
      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 mb-4 border border-zinc-100 dark:border-zinc-700">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 overflow-hidden">
          {driver?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={driver.photoUrl}
              alt={driver.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xl font-bold">
              {driver?.name?.[0] ?? "D"}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
            {driver?.name ?? "Your Driver"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {driver?.vehicle?.make} {driver?.vehicle?.model}
            {driver?.vehicle?.licensePlate && (
              <> &middot; {driver.vehicle.licensePlate}</>
            )}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">
            ★ {driver?.rating?.toFixed(1) ?? "5.0"}
          </p>
        </div>

        {/* Call button */}
        {driver?.phone && (
          <a
            href={`tel:${driver.phone}`}
            className="p-2 rounded-full bg-white dark:bg-white/10 hover:bg-zinc-100 dark:hover:bg-white/20 transition-colors flex-shrink-0"
            title="Call driver"
          >
            <Phone size={16} className="text-zinc-700 dark:text-zinc-300" />
          </a>
        )}
      </div>

      {/* Fare row */}
      {lockedEstimate && (
        <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl px-4 py-3 mb-5">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {lockedEstimate.distance.toFixed(1)} km &middot;{" "}
              {Math.ceil(lockedEstimate.duration)} min
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-0.5">
              Locked fare · no surprise charges
            </p>
          </div>
          <span className="text-xl font-black text-zinc-900 dark:text-white ml-4">
            {formatMoney(lockedEstimate.fare)}
          </span>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={isProcessing || isCancelling}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
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
              Pay
              {lockedEstimate ? ` · ${formatMoney(lockedEstimate.fare)}` : ""}
            </span>
          </>
        )}
      </button>

      {/* Cancel */}
      <button
        onClick={handleCancel}
        disabled={isProcessing || isCancelling}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
      >
        {isCancelling ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <X size={14} />
        )}
        <span className="text-sm font-medium">
          {isCancelling ? "Cancelling…" : "Cancel Ride"}
        </span>
      </button>
    </div>
  );
}
