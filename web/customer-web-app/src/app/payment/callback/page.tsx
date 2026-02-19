"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { useRideStore } from "@/app/main/ride/store/ride";

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

    /** Route the user to the correct page on payment failure */
    const handleFailure = () => {
      if (isRide) {
        localStorage.removeItem("pending_ride");
        localStorage.removeItem("pending_ride_id");
        setRideStatus("idle");
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
          toast.error("Session expired. Please sign in and check your payment status.");
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
        const isCheckout = localStorage.getItem("pending_checkout");
        // Re-read delivery data in case something changed during the async calls
        const pendingDeliveryData = localStorage.getItem("pending_delivery_data");

        if (isRide) {
          // Restore ride context into Zustand before navigating so the ride
          // page shows the correct state without waiting for the first poll.
          const pendingRideId = localStorage.getItem("pending_ride_id");
          if (pendingRideId) {
            setRideId(pendingRideId);
            // Mark as searching — backend will have transitioned the ride to
            // REQUESTED after payment verification, and driver matching is live.
            setRideStatus("searching");
          }
          localStorage.removeItem("pending_ride");
          localStorage.removeItem("pending_ride_id");
          router.replace("/main/ride");
        } else if (isCheckout) {
          clearCart();
          localStorage.removeItem("pending_checkout");
          const orderId = localStorage.getItem("last_order_id");
          router.replace(
            orderId ? `/main/orders/confirmed?id=${orderId}` : "/main/orders",
          );
        } else if (pendingDeliveryData) {
          try {
            const { id } = JSON.parse(pendingDeliveryData);
            // Reset the Zustand delivery store so returning to /main/delivery
            // after this delivery won't auto-redirect to this tracking page.
            resetDelivery();
            localStorage.removeItem("pending_delivery_data");
            router.replace(id ? `/main/delivery/${id}` : "/main/delivery");
          } catch (e) {
            console.error("Failed to parse pending_delivery_data", e);
            localStorage.removeItem("pending_delivery_data");
            router.replace("/main/delivery");
          }
        } else {
          router.replace("/main/store");
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        toast.error(
          error?.message || "Payment verification failed. Please contact support.",
        );
        handleFailure();
      }
    };

    verifyAndComplete();
  }, [searchParams, router, clearCart, resetDelivery, session, setRideId, setRideStatus]);

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
