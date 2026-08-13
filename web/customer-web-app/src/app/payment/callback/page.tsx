"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { useRideStore, type RideStage } from "@/app/main/ride/store/ride";
import { RideService } from "@/services/ride.service";
import { WalletService } from "@/services/wallet.service";
import {
  clearPurchaseContext,
  trackVerifiedPurchase,
} from "@/lib/meta-pixel";

// Use the same base URL as ApiService so the versioned path is always correct.
// NEXT_PUBLIC_API_URL is expected to be "https://host/api/v1" (with prefix+version).
// Fallback explicitly includes /api/v1 to match NestJS global prefix + versioning.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { resetDelivery } = useDeliveryStore();

  const { data: session, status: sessionStatus } = useSession();
  const processedRef = useRef(false);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [successResult, setSuccessResult] = useState<{
    title: string;
    message: string;
    reference: string;
  } | null>(null);

  const showSuccessAndReturn = useCallback(
    (title: string, message: string, reference: string) => {
      setSuccessResult({ title, message, reference });
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = setTimeout(() => router.replace("/main/store"), 2000);
    },
    [router],
  );

  useEffect(() => () => {
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
  }, []);

  // Zustand ride store setters — used to restore ride state on return from Paystack
  const setRideId = useRideStore((s) => s.setRideId);
  const setRideStatus = useRideStore((s) => s.setRideStatus);
  const setPaymentConfirmed = useRideStore((s) => s.setPaymentConfirmed);

  useEffect(() => {
    if (processedRef.current) return;
    // The gateway callback is public, so an expired browser session must not
    // leave the user stuck on this page. Wait only while NextAuth is loading.
    if (sessionStatus === "loading") return;

    const reference = searchParams.get("reference") || searchParams.get("trxref");
    // Paystack also sends ?status=success|failed in some redirect flows
    const urlStatus = searchParams.get("status");

    // ── Context detection ──────────────────────────────────────────────────
    // These flags are written to localStorage BEFORE the Paystack redirect so
    // we know which flow the user was in when they return to the callback page.
    const isRide = localStorage.getItem("pending_ride") === "true";
    const pendingDeliveryRaw = localStorage.getItem("pending_delivery_data");
    const isDelivery = !!pendingDeliveryRaw;
    const pendingWalletTopupRaw = localStorage.getItem("pending_wallet_topup");
    const isWalletTopup = !!pendingWalletTopupRaw;
    const pendingBookingRaw = localStorage.getItem("pending_booking_data");
    const isBooking = !!pendingBookingRaw;

    const bookingReturnPath = () => {
      try {
        const pending = JSON.parse(pendingBookingRaw!);
        return typeof pending.returnTo === "string" && pending.returnTo.startsWith("/main/")
          ? pending.returnTo
          : pending.bookingId
            ? `/main/bookings/${pending.bookingId}`
            : "/main/bookings";
      } catch {
        return "/main/bookings";
      }
    };

    /** Route the user to the correct page on payment cancellation */
    const handleCancellation = () => {
      // ✅ FIXED: Explicit handler for user-cancelled payments with appropriate messaging
      toast.warn("Payment cancelled. You can try again whenever you're ready.");
      clearPurchaseContext();

      if (isBooking) {
        localStorage.removeItem("pending_booking_data");
        router.replace(bookingReturnPath());
      } else if (isWalletTopup) {
        localStorage.removeItem("pending_wallet_topup");
        router.replace("/main/delivery");
      } else if (isRide) {
        localStorage.removeItem("pending_ride");
        localStorage.removeItem("pending_ride_id");
        // Reset paymentConfirmed so the sync hook correctly maps states
        setPaymentConfirmed(false);
        // Keep user on payment-required screen so they can retry payment
        setRideStatus("payment-required");
        router.replace("/main/ride");
      } else if (isDelivery) {
        // ✅ FIXED: Clear pending_delivery_data on cancellation but preserve form data
        // so user can restart the delivery process or retry immediately
        localStorage.removeItem("pending_delivery_data");
        // User should be returned to delivery config form to retry, not stuck on processing
        router.replace("/main/delivery");
      } else {
        // For checkout, return to checkout (cart items preserved by NOT clearing here)
        router.replace("/main/checkout");
      }
    };

    /** Route the user to the correct page on payment failure */
    const handleFailure = () => {
      clearPurchaseContext();
      if (isBooking) {
        router.replace(bookingReturnPath());
      } else if (isWalletTopup) {
        localStorage.removeItem("pending_wallet_topup");
        router.replace("/main/delivery");
      } else if (isRide) {
        localStorage.removeItem("pending_ride");
        localStorage.removeItem("pending_ride_id");
        // Reset paymentConfirmed so the sync hook correctly maps
        // COMPLETED → 'payment-required' if user retries.
        setPaymentConfirmed(false);
        // Keep user on payment-required screen so they can retry payment
        // — the ride is already completed on the backend.
        setRideStatus("payment-required");
        router.replace("/main/ride");
      } else if (isDelivery) {
        // Do NOT clear pending_delivery_data — the delivery page's recovery
        // effect will detect it and allow the user to retry or verify manually.
        router.replace("/main/delivery");
      } else {
        router.replace("/main/checkout");
      }
    };

    if (!reference) {
      toast.error("Invalid payment reference");
      handleFailure();
      return;
    }

    const verifyAndComplete = async () => {
      processedRef.current = true;

      // ✅ FIXED: Explicitly handle cancellation status separately
      if (urlStatus === "cancelled") {
        handleCancellation();
        return;
      }

      // If Paystack itself reported failure via URL param, fast-fail without
      // making a network call that would record a failed status redundantly.
      if (urlStatus && urlStatus !== "success") {
        toast.error("Payment was not completed.");
        handleFailure();
        return;
      }

      try {
        // Rehydrate persisted stores so cart/delivery state is available
        await useCartStore.persist.rehydrate();
        await useDeliveryStore.persist.rehydrate();

        const token =
          (session as any)?.accessToken ||
          (session?.user as any)?.accessToken ||
          "";

        // Process Paystack's gateway callback first. This is the canonical
        // backend endpoint that records the successful gateway result. Keep
        // the legacy verifier below as a compatibility fallback while older
        // transactions and environments are still in circulation.
        let callbackData: any = null;
        try {
          const callbackParams = new URLSearchParams({
            reference,
            trxref: searchParams.get("trxref") || reference,
          });
          const callbackResponse = await fetch(
            `${API_BASE}/payments/callback/paystack?${callbackParams.toString()}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            },
          );

          const callbackText = await callbackResponse.text();
          if (callbackText) {
            try { callbackData = JSON.parse(callbackText); }
            catch { callbackData = { success: callbackResponse.ok }; }
          } else {
            callbackData = { success: callbackResponse.ok };
          }

          if (!callbackResponse.ok || callbackData?.success === false) {
            throw new Error(callbackData?.message || "Paystack callback was not successful");
          }

          const callbackStatus = String(
            callbackData?.data?.paymentStatus ??
            callbackData?.data?.status ??
            callbackData?.paymentStatus ??
            callbackData?.status ??
            "SUCCESS",
          ).toUpperCase();
          if (["FAILED", "CANCELLED", "ABANDONED"].includes(callbackStatus)) {
            throw new Error(callbackData?.message || "Payment was not completed");
          }
        } catch (callbackError) {
          console.warn("Paystack callback processing fell back to verification:", callbackError);
          callbackData = null;
        }

        if (isWalletTopup) {
          let topupReference = reference;
          try {
            const pendingTopup = JSON.parse(pendingWalletTopupRaw!);
            topupReference = pendingTopup.reference || reference;
          } catch {
            // The Paystack reference is still sufficient for verification.
          }

          await WalletService.verifyTopup(topupReference, token);
          localStorage.removeItem("pending_wallet_topup");
          showSuccessAndReturn(
            "Wallet topped up",
            "Your payment was successful and your new balance is ready to use.",
            reference,
          );
          return;
        }

        // Read the gateway stored alongside the reference before the redirect.
        // Delivery flow always uses PAYSTACK; this future-proofs other gateways.
        let gateway = "PAYSTACK";
        try {
          if (pendingDeliveryRaw) {
            gateway = JSON.parse(pendingDeliveryRaw).gateway || "PAYSTACK";
          }
        } catch {}

        const res = callbackData ? null : await fetch(
          `${API_BASE}/payment/verify?reference=${encodeURIComponent(reference)}&gateway=${gateway}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res?.status === 401) {
          // Session expired during Paystack redirect — send to sign-in
          toast.error(
            "Session expired. Please sign in and check your payment status.",
          );
          router.replace("/sign-in?reason=session_expired");
          return;
        }

        if (res && !res.ok) {
          let errorMessage = "Verification failed";
          try {
            const errData = await res.json();
            errorMessage = errData.message || errorMessage;
          } catch {
            /* ignore JSON parse errors on error responses */
          }
          throw new Error(errorMessage);
        }

        const data = callbackData || await res!.json();

        // Backend returns PaymentStatus enum value 'COMPLETED'
        const isSuccess = callbackData?.success !== false && (
          callbackData !== null ||
          data.status === "COMPLETED" ||
          data.status === "SUCCESS" ||
          data.data?.status === "COMPLETED" ||
          data.data?.status === "SUCCESS"
        );

        if (!isSuccess) {
          throw new Error("Payment verification returned non-success status");
        }

        // ── Route back to the originating flow ──────────────────────────────
        // Primary: use entity IDs returned directly from the backend verify
        // response — works even if localStorage was cleared (e.g. different tab).
        const callbackPayload = data.data ?? data;
        const callbackMeta = data.meta ?? callbackPayload.meta ?? callbackPayload.metadata ?? {};
        const metaRideId: string | undefined = callbackMeta.rideId;
        const metaOrderGroupId: string | undefined = callbackMeta.orderGroupId;
        const metaOrderId: string | undefined = callbackMeta.orderId;
        const metaDeliveryId: string | undefined = callbackMeta.deliveryId ?? callbackMeta.parcelId;
        const metaBookingId: string | undefined = callbackMeta.bookingId;

        // Secondary: localStorage flags set before Paystack redirect (existing flow)
        const isCheckout = localStorage.getItem("pending_checkout");
        // Re-read delivery data in case something changed during the async calls
        const pendingDeliveryData = localStorage.getItem(
          "pending_delivery_data",
        );

        const purchaseContentId =
          metaRideId || metaDeliveryId || metaBookingId || metaOrderGroupId || metaOrderId;
        const fallbackCategory = metaBookingId || isBooking
          ? "accommodation"
          : metaRideId || isRide
          ? "ride"
          : metaDeliveryId || pendingDeliveryData
            ? "dispatch"
            : "shopping";
        trackVerifiedPurchase(reference, {
          value: Number(data.amount ?? callbackPayload.amount),
          currency: data.currency ?? callbackPayload.currency ?? "NGN",
          contentCategory: fallbackCategory,
          contentId: purchaseContentId,
        });

        if (metaBookingId || isBooking) {
          localStorage.removeItem("pending_booking_data");
          showSuccessAndReturn("Booking payment successful", "Your accommodation has been paid for and your booking is ready.", reference);
        } else if (metaRideId || isRide) {
          // Restore ride context into Zustand before navigating so the ride
          // page shows the correct state without waiting for the first poll.
          const pendingRideId =
            metaRideId || localStorage.getItem("pending_ride_id");
          const UUID_RE =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (pendingRideId && UUID_RE.test(pendingRideId)) {
            setRideId(pendingRideId);
          }

          // Ensure payment confirmed so sync hook maps DRIVER_ACCEPTED → 'confirmed'
          setPaymentConfirmed(true);

          // Post-ride payment: after successful payment, ride is complete.
          // Map to 'finished' so the RatingModal shows.
          try {
            const currentRide = await RideService.getCurrentRide(token);
            if (currentRide) {
              const STATUS_MAP: Record<string, RideStage> = {
                REQUESTED: "searching",
                SEARCHING_DRIVER: "searching",
                DRIVER_ASSIGNED: "searching",
                DRIVER_ACCEPTED: "confirmed",
                ACCEPTED: "confirmed",
                // Post-ride model: PAID means payment collected after ride = fully done
                PAID: "finished",
                ARRIVED: "arrived",
                IN_PROGRESS: "in-progress",
                COMPLETED: "finished",
              };
              setRideStatus(STATUS_MAP[currentRide.status] ?? "finished");
            } else {
              // No active ride — ride is COMPLETED (not returned by getCurrentRide)
              // In post-ride model, this is expected. Set to finished.
              setRideStatus("finished");
            }
          } catch {
            // Non-fatal — set to finished since payment just verified
            setRideStatus("finished");
          }

          localStorage.removeItem("pending_ride");
          localStorage.removeItem("pending_ride_id");
          showSuccessAndReturn("Ride payment successful", "Your ride payment has been confirmed.", reference);
        } else if (metaDeliveryId || pendingDeliveryData) {
          resetDelivery();
          localStorage.removeItem("pending_delivery_data");
          showSuccessAndReturn("Delivery payment successful", "Your delivery request has been paid for and is ready for tracking.", reference);
        } else if (metaOrderGroupId || metaOrderId || isCheckout) {
          // Order — prefer backend-returned group/order ID, fall back to localStorage
          clearCart();
          localStorage.removeItem("pending_checkout");
          showSuccessAndReturn("Order payment successful", "Your order is confirmed and has been sent to the vendor.", reference);
        } else {
          showSuccessAndReturn("Payment successful", "Your payment has been confirmed successfully.", reference);
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        // FIX M6: Include the Paystack reference in the error toast so the
        // user (and support) can trace the transaction.
        const refSuffix = reference ? ` (ref: ${reference})` : "";
        toast.error(
          (error?.message || "Payment verification failed.") +
            refSuffix +
            " Please contact support if you were charged.",
        );
        handleFailure();
      }
    };

    verifyAndComplete();
  }, [
    searchParams,
    router,
    clearCart,
    resetDelivery,
    session,
    sessionStatus,
    setRideId,
    setRideStatus,
    setPaymentConfirmed,
    showSuccessAndReturn,
  ]);

  if (successResult) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f5] px-4 py-12 dark:bg-[#090909]">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300/20 blur-3xl dark:bg-yellow-500/10" />
        <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white p-6 text-center shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#151515] sm:p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50 dark:bg-emerald-500/15 dark:ring-emerald-500/5">
            <CheckCircle2 className="h-11 w-11 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> Payment confirmed</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">{successResult.title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">{successResult.message}</p>

          <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-left dark:bg-white/[0.04]">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-yellow-600 shadow-sm dark:bg-white/5"><ReceiptText className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment reference</p><p className="mt-1 truncate font-mono text-xs font-bold text-gray-700 dark:text-gray-200">{successResult.reference}</p></div></div>
          </div>

          <button type="button" onClick={() => router.replace("/main/store")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-black transition hover:bg-yellow-300 active:scale-[0.98]">Continue to store <ArrowRight className="h-4 w-4" /></button>
          <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400"><ShieldCheck className="h-4 w-4" /> Returning you in 2 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Securely Verifying Payment…
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
        Do not close this window.
      </p>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <CallbackContent />
    </Suspense>
  );
}
