import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useRide } from "@/context/RideContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { initiatePayment } from "@/services/payment.service";
import { Ride } from "@/types/ride";

export function useRideActions(currentRide: Ride | null) {
  const router = useRouter();
  const { cancelRide, refreshCurrentRide, resetRideState } = useRide();
  const { user } = useUserProfile();

  // Payment flow
  const [paying, setPaying] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Cancel flow
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const handlePayNow = useCallback(async () => {
    if (!currentRide?.id || !user) return;

    setPaying(true);
    try {
      const response = await initiatePayment(
        "paystack",
        {
          type: "RIDE",
          rideId: currentRide.id,
          callbackUrl: "asoose-app://payment-callback",
        },
        user,
      );

      const url = response.authorizationUrl || response.checkoutUrl;
      const ref = response.reference || response.transactionId || "";

      if (url) {
        setPaymentUrl(url);
        setPaymentRef(ref);
        setShowPaymentWebView(true);
      }
    } catch (e) {
      console.error("Payment init failed", e);
      // Optionally show toast/error message here
    } finally {
      setPaying(false);
    }
  }, [currentRide?.id, user]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    // Navigate to the success / receipt screen.
    // The RIDE_PAYMENT_COMPLETED socket event will also flip the ride status to PAID,
    // which triggers the auto-navigate in tracking.tsx as a secondary path.
    router.replace("/(tabs)/ride/success" as any);
  }, [router]);

  const handlePaymentCancel = useCallback(() => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCurrentRide();
    setRefreshing(false);
  }, [refreshCurrentRide]);

  const handleCancel = useCallback(() => {
    setSelectedReason(null);
    setCustomReason("");
    setShowCancelSheet(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!selectedReason) return;

    const isOther = selectedReason === "Other (specify below)";
    const reason = isOther ? customReason.trim() || "Other" : selectedReason;

    setCancelling(true);
    setShowCancelSheet(false);

    try {
      await cancelRide(reason);
      router.replace("/ride");
    } catch (e) {
      console.error("Cancel failed", e);
      // Optionally show error toast
    } finally {
      setCancelling(false);
    }
  }, [selectedReason, customReason, cancelRide, router]);

  return {
    // Refresh
    refreshing,
    handleRefresh,

    // Payment
    paying,
    paymentUrl,
    paymentRef,
    showPaymentWebView,
    handlePayNow,
    handlePaymentSuccess,
    handlePaymentCancel,

    // Cancel
    showCancelSheet,
    selectedReason,
    customReason,
    cancelling,
    setShowCancelSheet,
    setSelectedReason,
    setCustomReason,
    handleCancel,
    handleConfirmCancel,

    // (handleRefresh moved to top of return)
  };
}
