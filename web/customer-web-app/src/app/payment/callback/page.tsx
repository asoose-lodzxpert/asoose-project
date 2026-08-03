"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { useRideStore, type RideStage } from "@/app/main/ride/store/ride";
import { RideService } from "@/services/ride.service";
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

  const { data: session } = useSession();
  const processedRef = useRef(false);

  // Zustand ride store setters — used to restore ride state on return from Paystack
  const setRideId = useRideStore((s) => s.setRideId);
  const setRideStatus = useRideStore((s) => s.setRideStatus);
  const setPaymentConfirmed = useRideStore((s) => s.setPaymentConfirmed);

  useEffect(() => {
    if (processedRef.current) return;
    // Wait for session to be resolved before attempting verification
    if (!session) return;

    const reference = searchParams.get("reference");
    // Paystack also sends ?status=success|failed in some redirect flows
    const urlStatus = searchParams.get("status");

    // ── Context detection ──────────────────────────────────────────────────
    // These flags are written to localStorage BEFORE the Paystack redirect so
    // we know which flow the user was in when they return to the callback page.
    const isRide = localStorage.getItem("pending_ride") === "true";
    const pendingDeliveryRaw = localStorage.getItem("pending_delivery_data");
    const isDelivery = !!pendingDeliveryRaw;

    /** Route the user to the correct page on payment cancellation */
    const handleCancellation = () => {
      // ✅ FIXED: Explicit handler for user-cancelled payments with appropriate messaging
      toast.warn("Payment cancelled. You can try again whenever you're ready.");
      clearPurchaseContext();

      if (isRide) {
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
      if (isRide) {
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
          (session as any).accessToken ||
          (session.user as any)?.accessToken ||
          "";

        // Read the gateway stored alongside the reference before the redirect.
        // Delivery flow always uses PAYSTACK; this future-proofs other gateways.
        let gateway = "PAYSTACK";
        try {
          if (pendingDeliveryRaw) {
            gateway = JSON.parse(pendingDeliveryRaw).gateway || "PAYSTACK";
          }
        } catch (_) {}

        const res = await fetch(
          `${API_BASE}/payment/verify?reference=${encodeURIComponent(reference)}&gateway=${gateway}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.status === 401) {
          // Session expired during Paystack redirect — send to sign-in
          toast.error(
            "Session expired. Please sign in and check your payment status.",
          );
          router.replace("/sign-in?reason=session_expired");
          return;
        }

        if (!res.ok) {
          let errorMessage = "Verification failed";
          try {
            const errData = await res.json();
            errorMessage = errData.message || errorMessage;
          } catch (_) {
            /* ignore JSON parse errors on error responses */
          }
          throw new Error(errorMessage);
        }

        const data = await res.json();

        // Backend returns PaymentStatus enum value 'COMPLETED'
        const isSuccess =
          data.status === "COMPLETED" ||
          data.status === "SUCCESS" ||
          data.data?.status === "COMPLETED" ||
          data.data?.status === "SUCCESS";

        if (!isSuccess) {
          throw new Error("Payment verification returned non-success status");
        }

        toast.success("Payment verified successfully!");

        // ── Route back to the originating flow ──────────────────────────────
        // Primary: use entity IDs returned directly from the backend verify
        // response — works even if localStorage was cleared (e.g. different tab).
        const metaRideId: string | undefined = data.meta?.rideId;
        const metaOrderGroupId: string | undefined = data.meta?.orderGroupId;
        const metaOrderId: string | undefined = data.meta?.orderId;
        const metaDeliveryId: string | undefined = data.meta?.deliveryId;

        // Secondary: localStorage flags set before Paystack redirect (existing flow)
        const isCheckout = localStorage.getItem("pending_checkout");
        // Re-read delivery data in case something changed during the async calls
        const pendingDeliveryData = localStorage.getItem(
          "pending_delivery_data",
        );

        const purchaseContentId =
          metaRideId || metaDeliveryId || metaOrderGroupId || metaOrderId;
        const fallbackCategory = metaRideId || isRide
          ? "ride"
          : metaDeliveryId || pendingDeliveryData
            ? "dispatch"
            : "shopping";
        trackVerifiedPurchase(reference, {
          value: Number(data.amount ?? data.data?.amount),
          currency: data.currency ?? data.data?.currency ?? "NGN",
          contentCategory: fallbackCategory,
          contentId: purchaseContentId,
        });

        if (metaRideId || isRide) {
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
          router.replace("/main/ride");
        } else if (metaDeliveryId || pendingDeliveryData) {
          // Delivery — use backend-returned ID first, then localStorage
          const deliveryId =
            metaDeliveryId ??
            (() => {
              try {
                return JSON.parse(pendingDeliveryData!).id;
              } catch {
                return null;
              }
            })();
          resetDelivery();
          localStorage.removeItem("pending_delivery_data");
          router.replace(
            deliveryId ? `/main/delivery/${deliveryId}` : "/main/delivery",
          );
        } else if (metaOrderGroupId || metaOrderId || isCheckout) {
          // Order — prefer backend-returned group/order ID, fall back to localStorage
          clearCart();
          localStorage.removeItem("pending_checkout");
          const orderId =
            metaOrderGroupId ||
            metaOrderId ||
            localStorage.getItem("last_order_id");
          router.replace(
            orderId ? `/main/orders/confirmed?id=${orderId}` : "/main/orders",
          );
        } else {
          router.replace("/main/store");
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
    setRideId,
    setRideStatus,
    setPaymentConfirmed,
  ]);

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
