'use client';

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { Banknote, CreditCard, Phone, Loader2, X } from "lucide-react";
import { useRideStore } from "../store/ride";
import { SidebarSection, SidebarDivider } from "./Sidebar";
import { PrimaryButton, SecondaryButton, Text } from "@/components/ui";
import { paymentService } from "@/services/payment.service";
import { RideService } from "@/services/ride.service";

/**
 * PostDriverPayment
 * -----------------
 * Shown when a driver has been assigned (ACCEPTED status) but the user has
 * not yet confirmed their payment method. This is the "match first, pay after"
 * screen introduced to mirror the mobile app's late-payment UX.
 *
 * States it can transition to:
 *   • 'confirmed'  — after user selects CASH (instant) or CARD (after redirect back)
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
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);

  // ── CASH ───────────────────────────────────────────────────────────────────
  const handleCash = () => {
    // For cash rides the backend already has PaymentMethod.CASH recorded from
    // the initial confirm call. No further API call needed — just let the ride
    // proceed and flag that payment selection is done.
    setPaymentConfirmed(true);
    setRideStatus("confirmed");
    toast.success(`${driver?.name ?? "Driver"} is on the way! Pay cash on arrival.`);
  };

  // ── CARD ───────────────────────────────────────────────────────────────────
  const handleCard = async () => {
    if (!session?.accessToken || !rideId) {
      toast.error("Unable to process payment. Please try again.");
      return;
    }

    setIsProcessing(true);
    try {
      const email = (session.user as any)?.email || "";
      const amount = lockedEstimate?.fare ?? 0;

      const frontendOrigin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

      const paymentRes = await paymentService.initiatePayment(
        {
          amount,
          email,
          gateway: "PAYSTACK",
          method: "CARD",
          type: "RIDE",
          rideId,
          // Backend appends /payment/callback so we send only the origin.
          callbackUrl: frontendOrigin,
        },
        session.accessToken,
      );

      if (!paymentRes.authorizationUrl) {
        throw new Error("Paystack authorisation URL not returned. Please try again.");
      }

      // Persist state so the callback page can restore context on return
      localStorage.setItem("pending_ride", "true");
      localStorage.setItem("pending_ride_id", rideId);

      // Mark payment confirmed so the sync hook maps ACCEPTED → 'confirmed' on return
      setPaymentConfirmed(true);

      // Navigate to Paystack checkout — user leaves the app here
      window.location.href = paymentRes.authorizationUrl;
      // Don't reset isProcessing; the navigation clears the page
    } catch (err: any) {
      console.error("Paystack init failed:", err);
      toast.error(err?.message || "Failed to initialise card payment. Please try again.");
      localStorage.removeItem("pending_ride");
      localStorage.removeItem("pending_ride_id");
      setIsProcessing(false);
    }
  };

  // ── CANCEL ─────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!rideId || isCancelling) return;
    setIsCancelling(true);
    try {
      await RideService.cancelRide(rideId, "Customer cancelled before payment", session?.accessToken);
      toast.info("Ride cancelled.");
      setPaymentConfirmed(false);
      setRideId(null);
      setRideStatus("idle");
    } catch (err: any) {
      console.error("Cancel failed:", err);
      toast.error(err?.message || "Failed to cancel ride. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      {/* Driver card */}
      <SidebarSection title="Driver Assigned">
        <div className="w-full flex items-center gap-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
            {driver?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={driver.photoUrl} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                {driver?.name?.[0] ?? "D"}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {driver?.name ?? "Your Driver"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {driver?.vehicle.make} {driver?.vehicle.model} &middot; {driver?.vehicle.licensePlate}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">
              ★ {driver?.rating?.toFixed(1) ?? "5.0"}
            </p>
          </div>

          {/* Phone */}
          {driver?.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="p-2 rounded-full bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors flex-shrink-0"
              title="Call driver"
            >
              <Phone size={16} className="text-gray-700 dark:text-gray-300" />
            </a>
          )}
        </div>
      </SidebarSection>

      <SidebarDivider />

      {/* Fare summary */}
      {lockedEstimate && (
        <SidebarSection title="Fare">
          <div className="w-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lockedEstimate.distance.toFixed(1)} km &middot;{" "}
                {Math.ceil(lockedEstimate.duration)} min
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-0.5">
                Confirmed fare — no surprise charges
              </p>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white">
              {formatMoney(lockedEstimate.fare)}
            </span>
          </div>
        </SidebarSection>
      )}

      <SidebarDivider />

      {/* Payment selection */}
      <SidebarSection title="How would you like to pay?">
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Cash */}
          <SecondaryButton
            onClick={handleCash}
            disabled={isProcessing || isCancelling}
            className="h-20 flex flex-col items-center justify-center gap-1"
          >
            <Banknote size={22} className="text-green-600 dark:text-green-400" />
            <Text size="sm" weight="semibold">Cash</Text>
            <Text size="xs" variant="secondary">Pay driver directly</Text>
          </SecondaryButton>

          {/* Card */}
          <PrimaryButton
            onClick={handleCard}
            disabled={isProcessing || isCancelling}
            className="h-20 flex flex-col items-center justify-center gap-1"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-white" />
                <Text size="xs" className="text-white">Redirecting…</Text>
              </span>
            ) : (
              <>
                <CreditCard size={22} className="text-white" />
                <Text size="sm" weight="semibold" className="text-white">Card</Text>
                <Text size="xs" className="text-white/70">Pay via Paystack</Text>
              </>
            )}
          </PrimaryButton>
        </div>
      </SidebarSection>

      <SidebarDivider />

      {/* Cancel */}
      <SidebarSection title="">
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
          <Text size="sm" className="text-red-600 dark:text-red-400">
            {isCancelling ? "Cancelling…" : "Cancel Ride"}
          </Text>
        </button>
      </SidebarSection>
    </>
  );
}
