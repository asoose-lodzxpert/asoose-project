"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  MapPin,
  User,
  Phone,
} from "lucide-react";
import { toast } from "react-toastify";
import { deliverySwal } from "@/lib/swal-theme";
import { useSession } from "next-auth/react";
import BottomNav from "../components/layout/BottomNav";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { LocationInput } from "@/components/shared/LocationInput";
import DeliveryProgressUI from "./components/DeliveryProgressUi";
import PackageForm from "./components/PackageForm"; // ✅ Imported new component
import { ReviewModal } from "@/store/ReviewModal";
import { paymentService } from "@/services/payment.service";
import { DeliveryService } from "@/services/delivery.service";
import { socketService } from "@/services/socket.service";

// CONSTANTS & TYPES
// Stage names aligned with backend DeliveryStatus enum where applicable.
// ⚠️  Backend statuses ACCEPTED and IN_TRANSIT must be present here so the
//     redirect guard and socket handler can transition correctly.
const DeliveryStage = {
  IDLE: "IDLE",
  CONFIGURING: "CONFIGURING",
  PROCESSING_ADDRESS: "Processing_Address",
  CALCULATING_FEE: "Calculating_Fee",
  REVIEW_PAYMENT: "REVIEW_PAYMENT",
  PAYMENT_PENDING: "Payment_Pending",
  REQUESTED: "REQUESTED", // Backend: REQUESTED (finding courier)
  ASSIGNED: "ASSIGNED", // Backend: ASSIGNED (courier matched)
  ACCEPTED: "ACCEPTED", // Backend: ACCEPTED (rider confirmed acceptance)
  PICKED_UP: "PICKED_UP", // Backend: PICKED_UP
  IN_TRANSIT: "IN_TRANSIT", // Backend: IN_TRANSIT (en route)
  DELIVERED: "DELIVERED", // Backend: DELIVERED (final)
} as const;

const PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;
// Stores { id, reference, gateway } so payment can be verified after redirect-back.
const PENDING_DELIVERY_KEY = "pending_delivery_data";

interface DetailInputProps {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

interface SessionWithToken {
  accessToken?: string;
  user?: {
    accessToken?: string;
    email?: string;
  };
}

// UTILITIES

const normalizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.startsWith("+234")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("234")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
};

const validatePhoneNumber = (
  phone: string,
): { valid: boolean; error: string | null } => {
  if (!phone) return { valid: false, error: null };
  const normalized = normalizePhoneNumber(phone);
  if (!PHONE_REGEX.test(normalized)) {
    return {
      valid: false,
      error: "Enter valid Nigerian number (e.g. 08012345678)",
    };
  }
  return { valid: true, error: null };
};

const getAuthToken = (session: any): string | null => {
  const typedSession = session as SessionWithToken;
  return typedSession?.accessToken || typedSession?.user?.accessToken || null;
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input ? input.trim().slice(0, maxLength) : "";
};

// MAIN COMPONENT

export default function DeliveryPage() {
  const router = useRouter();
  const {
    packageInfo,
    setPackageInfo,
    setLocations,
    pickupPos,
    dropoffPos,
    setStage,
    stage,
    courierInfo,
    activeDeliveryId,
    setAddressIds,
    setCalculatedFee,
    calculatedFee,
    resetDelivery,
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [senderPhoneError, setSenderPhoneError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<boolean>(false);
  const { data: session, status } = useSession();

  // Redirect if we are in a backend-sourced tracking state.
  // ACCEPTED and IN_TRANSIT are valid backend DeliveryStatus values that must
  // also trigger a redirect so the user is never stuck on the form page.
  useEffect(() => {
    const trackingStages: string[] = [
      DeliveryStage.REQUESTED,
      DeliveryStage.ASSIGNED,
      DeliveryStage.ACCEPTED,
      DeliveryStage.PICKED_UP,
      DeliveryStage.IN_TRANSIT,
      DeliveryStage.DELIVERED,
    ];
    if (activeDeliveryId && trackingStages.includes(stage)) {
      router.push(`/main/delivery/${activeDeliveryId}`);
    }
  }, [stage, activeDeliveryId, router]);

  // RECOVERY LOGIC
  const handlePaymentSuccess = useCallback(
    (id?: string) => {
      // Capture the target ID before resetting the store (which clears activeDeliveryId)
      const targetId = id || activeDeliveryId;
      localStorage.removeItem(PENDING_DELIVERY_KEY);
      resetDelivery();
      toast.success("Payment confirmed!");
      if (targetId) {
        router.push(`/main/delivery/${targetId}`);
      }
    },
    [activeDeliveryId, resetDelivery, router],
  );

  // ─── Payment Recovery ────────────────────────────────────────────────────
  // Run once per session-load.  `stage` is intentionally NOT in the dep-array:
  // including it caused the effect to re-fire after `setStage()` was called
  // inside `handlePaymentSuccess`, risking concurrent duplicate verification.
  //
  // Instead we read the current snapshot of `stage` from the Zustand store
  // directly inside the async body, which is always fresh at call time.
  useEffect(() => {
    const recoverState = async () => {
      if (status === "loading") return;

      const storedData = localStorage.getItem(PENDING_DELIVERY_KEY);
      if (!storedData) return;

      const token = getAuthToken(session);

      try {
        const { id, reference, gateway = "PAYSTACK" } = JSON.parse(storedData);
        if (!id || !reference) {
          localStorage.removeItem(PENDING_DELIVERY_KEY);
          return;
        }

        // Read current stage from store snapshot (not from closure)
        const currentStage = useDeliveryStore.getState().stage;
        const needsRecovery =
          currentStage === DeliveryStage.PAYMENT_PENDING ||
          currentStage === DeliveryStage.REVIEW_PAYMENT;

        if (!needsRecovery) return;

        // 1. Try active payment verification first
        const isVerified = await DeliveryService.verifyPayment(
          reference,
          gateway,
          token || undefined,
        );

        if (isVerified) {
          handlePaymentSuccess(id);
          return;
        }

        // 2. Fall back to polling the delivery status from the DB
        useDeliveryStore.setState({ activeDeliveryId: id });
        setStage(DeliveryStage.PAYMENT_PENDING);

        const success = await DeliveryService.pollDeliveryStatus(
          id,
          undefined,
          undefined,
          undefined,
          token || undefined,
        );
        if (success) {
          handlePaymentSuccess(id);
        }
      } catch (e) {
        console.error("Failed to recover pending delivery state", e);
        localStorage.removeItem(PENDING_DELIVERY_KEY);
      }
    };

    recoverState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, handlePaymentSuccess]);

  // EVENT HANDLERS

  const handleSocketUpdate = useCallback(
    (data: any) => {
      // Map backend ACCEPTED (rider confirmed) → ASSIGNED (same UI step)
      if (data.status === "ASSIGNED" || data.status === "ACCEPTED") {
        useDeliveryStore.setState({
          courierInfo: data.rider,
          stage: DeliveryStage.ASSIGNED,
        });
        toast.info("Courier found! They are on their way.");
      } else if (data.status === "PICKED_UP") {
        setStage(DeliveryStage.PICKED_UP);
        toast.info("Package picked up.");
      } else if (data.status === "IN_TRANSIT") {
        // IN_TRANSIT is a valid backend status – redirect to detail tracking
        setStage(DeliveryStage.IN_TRANSIT);
      } else if (data.status === "DELIVERED") {
        setStage(DeliveryStage.DELIVERED);
      }
    },
    [setStage],
  );

  useEffect(() => {
    const token = getAuthToken(session);
    if (!token || !activeDeliveryId) return;

    socketService.connect(token);

    // ⚠️  CRITICAL: The handler passed to `on()` and `off()` MUST be the same
    // reference.  Using an inline arrow function inside `on()` while passing
    // `handleSocketUpdate` to `off()` means the listener is never removed.
    const handler = (data: any) => {
      if (data.deliveryId === activeDeliveryId) handleSocketUpdate(data);
    };

    socketService.on("delivery_update", handler);
    return () => {
      socketService.off("delivery_update", handler);
    };
  }, [activeDeliveryId, session, handleSocketUpdate]);

  const handlePhoneChange = useCallback(
    (value: string) => {
      setPackageInfo({ recipientPhone: value });
      const validation = validatePhoneNumber(value);
      setPhoneError(validation.error);
    },
    [setPackageInfo],
  );

  const handleSenderPhoneChange = useCallback(
    (value: string) => {
      setPackageInfo({ senderPhone: value });
      if (!value) {
        setSenderPhoneError(null);
        return;
      }
      const validation = validatePhoneNumber(value);
      setSenderPhoneError(validation.error);
    },
    [setPackageInfo],
  );

  // ✅ Updated Logic: Initialize Delivery with Metadata
  const handleInitializeDelivery = async () => {
    const swal = deliverySwal();

    if (!pickupPos) {
      await swal.fire({
        icon: "warning",
        title: "Pickup Location Required",
        html: `
          <p>Please <strong>select a pickup location</strong> from the autocomplete suggestions.</p>
          <p class="mt-2 text-sm">Start typing an address and choose one of the options that appear — this ensures we get exact coordinates.</p>
        `,
        confirmButtonText: "Set Pickup",
      });
      return;
    }
    if (!dropoffPos) {
      await swal.fire({
        icon: "warning",
        title: "Delivery Address Required",
        html: `
          <p>Please <strong>select a delivery address</strong> from the autocomplete suggestions.</p>
          <p class="mt-2 text-sm">Start typing an address and choose one of the options that appear — this ensures we get exact coordinates.</p>
        `,
        confirmButtonText: "Set Address",
      });
      return;
    }
    if (!packageInfo.senderPhone) {
      await swal.fire({
        icon: "warning",
        title: "Your Phone Number Required",
        html: `
          <p>Please enter <strong>your phone number</strong> so the courier can contact you at pickup.</p>
          <p class="mt-2 text-sm">Accepted formats:</p>
          <ul class="text-sm mt-1 list-disc list-inside">
            <li><strong>08012345678</strong> (local format)</li>
            <li><strong>+2348012345678</strong> (international format)</li>
          </ul>
        `,
        confirmButtonText: "Enter Phone",
      });
      return;
    }
    if (senderPhoneError) {
      await swal.fire({
        icon: "error",
        title: "Invalid Sender Phone Number",
        html: `
          <p>Your phone number is <strong>not a valid Nigerian number</strong>.</p>
          <p class="mt-2 text-sm">Accepted formats:</p>
          <ul class="text-sm mt-1 list-disc list-inside">
            <li><strong>080, 081, 090, 091, 070, 071</strong> prefixes — 11 digits total</li>
            <li>e.g. <strong>08012345678</strong> or <strong>+2348012345678</strong></li>
          </ul>
          <p class="mt-2 text-xs" style="color:#ef4444">${senderPhoneError}</p>
        `,
        confirmButtonText: "Fix Number",
      });
      return;
    }
    if (!packageInfo.recipientName || !packageInfo.recipientName.trim()) {
      await swal.fire({
        icon: "warning",
        title: "Recipient Name Required",
        html: `
          <p>Please enter the <strong>full name</strong> of the person receiving the package.</p>
          <p class="mt-2 text-sm">This is used by the courier to identify the recipient on delivery.</p>
        `,
        confirmButtonText: "Enter Name",
      });
      return;
    }
    if (!packageInfo.recipientPhone) {
      await swal.fire({
        icon: "warning",
        title: "Phone Number Required",
        html: `
          <p>Please enter the <strong>recipient's Nigerian phone number</strong>.</p>
          <p class="mt-2 text-sm">Accepted formats:</p>
          <ul class="text-sm mt-1 list-disc list-inside">
            <li><strong>08012345678</strong> (local format)</li>
            <li><strong>+2348012345678</strong> (international format)</li>
          </ul>
        `,
        confirmButtonText: "Enter Phone",
      });
      return;
    }
    if (phoneError) {
      await swal.fire({
        icon: "error",
        title: "Invalid Phone Number",
        html: `
          <p>The phone number you entered is <strong>not a valid Nigerian number</strong>.</p>
          <p class="mt-2 text-sm">Accepted formats:</p>
          <ul class="text-sm mt-1 list-disc list-inside">
            <li><strong>080, 081, 090, 091, 070, 071</strong> prefixes — 11 digits total</li>
            <li>e.g. <strong>08012345678</strong> or <strong>+2348012345678</strong></li>
          </ul>
          <p class="mt-2 text-xs" style="color:#ef4444">${phoneError}</p>
        `,
        confirmButtonText: "Fix Number",
      });
      return;
    }

    const token = getAuthToken(session);
    if (!token) {
      toast.error("Please log in to continue");
      return;
    }

    setApiError(false);

    try {
      setStage(DeliveryStage.PROCESSING_ADDRESS);

      // `label` is required (non-nullable String) by the Address Prisma model.
      // Omitting it causes a DB constraint violation on every delivery attempt.
      const pickupRes = await DeliveryService.saveAddress(
        {
          label: "Pickup Location",
          street: sanitizeInput(packageInfo.pickupAddress),
          lat: pickupPos.lat,
          lng: pickupPos.lng,
        },
        token,
      );

      const dropoffRes = await DeliveryService.saveAddress(
        {
          label: "Delivery Address",
          street: sanitizeInput(packageInfo.destinationAddress),
          lat: dropoffPos.lat,
          lng: dropoffPos.lng,
        },
        token,
      );

      setAddressIds(pickupRes.id, dropoffRes.id);
      setStage(DeliveryStage.CALCULATING_FEE);

      // Use user-provided exact weight if available, else fallback to package type logic
      const finalWeight =
        typeof packageInfo.weightKg === "number" && packageInfo.weightKg > 0
          ? packageInfo.weightKg
          : 2.5; // Default fallback

      const deliveryRes = await DeliveryService.createDelivery(
        {
          pickupAddressId: pickupRes.id,
          dropoffAddressId: dropoffRes.id,
          recipientName: sanitizeInput(packageInfo.recipientName),
          recipientPhone: normalizePhoneNumber(packageInfo.recipientPhone),
          senderName: packageInfo.senderName.trim() || undefined,
          senderPhone: packageInfo.senderPhone
            ? normalizePhoneNumber(packageInfo.senderPhone)
            : undefined,
          // Avoid a trailing dash ("Document - ") when instructions are empty.
          packageDetails: sanitizeInput(
            packageInfo.instructions
              ? `${packageInfo.type} - ${packageInfo.instructions}`
              : packageInfo.type,
          ),

          // Optional Metadata Fields
          weightKg: finalWeight,
          declaredValue:
            typeof packageInfo.declaredValue === "number"
              ? packageInfo.declaredValue
              : undefined,
          fragile: packageInfo.isFragile,
          perishable: packageInfo.isPerishable,
          containsLiquid: packageInfo.containsLiquid,
        },
        token,
      );

      if (deliveryRes?.delivery?.id) {
        useDeliveryStore.setState({
          activeDeliveryId: deliveryRes.delivery.id,
        });
        setCalculatedFee(deliveryRes.deliveryFee);
        setStage(DeliveryStage.REVIEW_PAYMENT);
      } else {
        throw new Error("Invalid server response");
      }
    } catch (error: any) {
      console.error("Init Error:", error);
      toast.error(error.message || "Failed to initialize delivery.");
      setApiError(true);
      setStage(DeliveryStage.CONFIGURING);
    }
  };

  const handlePayment = async () => {
    if (!activeDeliveryId || !calculatedFee) return;
    const token = getAuthToken(session);
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      setStage(DeliveryStage.PAYMENT_PENDING);
      const userEmail =
        session?.user?.email || `guest-${Date.now()}@asoose.com`;

      // Build the frontend callback URL explicitly.
      // The backend stores this in payment.metadata and uses it to redirect
      // the user's browser BACK to the frontend after verifying with Paystack.
      // Without this, the backend falls back to process.env.FRONTEND_URL which
      // may be unset or wrong. NEXT_PUBLIC_APP_URL must be this app's port (3001),
      // NOT the backend port (3000).
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
      // Send just the base URL — the backend GET /callback/paystack handler
      // appends "/payment/callback" itself before redirecting the browser.
      const frontendCallbackUrl = appUrl;

      const paymentRes = await paymentService.initiatePayment(
        {
          amount: calculatedFee,
          email: userEmail,
          gateway: "PAYSTACK",
          method: "CARD",
          type: "DELIVERY",
          // deliveryId at the top level is used by the backend to look up the
          // delivery record and authoritative fee — amount above is a hint only.
          deliveryId: activeDeliveryId,
          // callbackUrl goes into payment.metadata so the backend GET callback
          // handler knows where to redirect the browser after verification.
          callbackUrl: frontendCallbackUrl,
          metadata: {
            deliveryId: activeDeliveryId,
            purpose: "DELIVERY_REQUEST",
          },
        },
        token,
      );

      if (paymentRes.authorizationUrl && paymentRes.reference) {
        // Store gateway alongside reference so verifyPayment can use the correct
        // gateway during recovery — without it the backend throws a validation error.
        localStorage.setItem(
          PENDING_DELIVERY_KEY,
          JSON.stringify({
            id: activeDeliveryId,
            reference: paymentRes.reference,
            gateway: "PAYSTACK",
          }),
        );
        window.location.href = paymentRes.authorizationUrl;
      } else {
        throw new Error("Invalid payment response");
      }
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error("Payment initialization failed");
      setStage(DeliveryStage.REVIEW_PAYMENT);
    }
  };

  const handleManualPaymentCheck = useCallback(async () => {
    if (activeDeliveryId) {
      const token = getAuthToken(session);
      // Read stored gateway so verification uses the correct payment provider
      let gateway = "PAYSTACK";
      try {
        const stored = localStorage.getItem(PENDING_DELIVERY_KEY);
        if (stored) gateway = JSON.parse(stored).gateway || "PAYSTACK";
      } catch (_) {}

      const storedRef = localStorage.getItem(PENDING_DELIVERY_KEY);
      const reference = storedRef ? JSON.parse(storedRef).reference : null;

      if (reference) {
        const isVerified = await DeliveryService.verifyPayment(
          reference,
          gateway,
          token || undefined,
        );
        if (isVerified) {
          handlePaymentSuccess();
          return;
        }
      }

      const success = await DeliveryService.pollDeliveryStatus(
        activeDeliveryId,
        undefined,
        undefined,
        undefined,
        token || undefined,
      );
      if (success) handlePaymentSuccess();
      else toast.info("Payment not yet confirmed. We are still checking...");
    }
  }, [activeDeliveryId, handlePaymentSuccess, session]);

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!activeDeliveryId) return;
    const token = getAuthToken(session);
    try {
      await DeliveryService.rateDelivery(
        activeDeliveryId,
        rating,
        sanitizeInput(comment, 1000),
        token || undefined,
      );
      toast.success("Review submitted successfully");
      setIsReviewModalOpen(false);
    } catch (error: any) {
      console.error("Review submission error:", error);
      // rateDelivery throws because the backend doesn't support it yet.
      // Show an honest info toast instead of a generic error.
      toast.info(error?.message || "Delivery rating is not yet available.");
    }
  };

  const renderStageContent = () => {
    if (apiError && stage === DeliveryStage.CONFIGURING) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
            Connection Failed
          </h3>
          <button
            onClick={handleInitializeDelivery}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium mt-4"
          >
            <RefreshCw size={18} /> Retry
          </button>
          <button
            onClick={() => setApiError(false)}
            className="mt-4 text-sm text-gray-500 underline"
          >
            Edit Details
          </button>
        </div>
      );
    }

    switch (stage) {
      case DeliveryStage.PROCESSING_ADDRESS:
      case DeliveryStage.CALCULATING_FEE:
        return (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={48} className="animate-spin text-yellow-500" />
            <p className="font-bold text-lg">Processing Logistics...</p>
          </div>
        );

      case DeliveryStage.REVIEW_PAYMENT:
        return (
          <div className="max-w-xl mx-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                <CreditCard size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2 dark:text-white">
                Review & Pay
              </h2>
              <p className="text-zinc-500">Total Delivery Fee</p>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl mb-6 flex justify-between items-center border border-zinc-100 dark:border-zinc-700">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Amount to Pay
              </span>
              <span className="text-3xl font-black dark:text-white">
                ₦{calculatedFee?.toLocaleString()}
              </span>
            </div>

            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl mb-8">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Vehicle assigned automatically based on package weight (
                {typeof packageInfo.weightKg === "number"
                  ? `${packageInfo.weightKg}kg`
                  : packageInfo.weight}
                ).
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePayment}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Pay Securely <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setStage(DeliveryStage.CONFIGURING)}
                className="w-full py-3 text-zinc-500 font-medium hover:text-zinc-800 transition-colors"
              >
                Cancel & Edit
              </button>
            </div>
          </div>
        );

      case DeliveryStage.PAYMENT_PENDING:
        return (
          <div className="text-center py-20">
            <Loader2
              size={48}
              className="animate-spin text-blue-500 mx-auto mb-4"
            />
            <h3 className="text-xl font-bold dark:text-white">
              Processing Payment
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Completing your secure transaction...
            </p>
            <button
              onClick={handleManualPaymentCheck}
              className="mt-6 text-sm font-medium text-blue-500 hover:underline"
            >
              I have completed payment
            </button>
          </div>
        );

      case DeliveryStage.REQUESTED:
      case DeliveryStage.ASSIGNED:
      case DeliveryStage.ACCEPTED:
      case DeliveryStage.PICKED_UP:
      case DeliveryStage.IN_TRANSIT:
      case DeliveryStage.DELIVERED:
        return <DeliveryProgressUI stage={stage} />;

      default: // CONFIGURING
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
            {/* Left Column: Addresses */}
            <div className="lg:col-span-7 space-y-12">
              <section>
                <div className="relative space-y-8 mt-10">
                  {/* Pickup Address */}
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <label className="text-sm font-medium mb-2 flex items-center gap-2 text-zinc-500">
                      <MapPin size={16} className="text-yellow-500" />
                      Pickup Location
                    </label>
                    <LocationInput
                      value={packageInfo.pickupAddress}
                      onValueChange={(v) =>
                        setPackageInfo({ pickupAddress: v })
                      }
                      onLocationSelect={(location, address) => {
                        setLocations(location, undefined);
                        setPackageInfo({ pickupAddress: address });
                      }}
                      placeholder="Enter pickup location"
                      showGeolocation
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <label className="text-sm font-medium mb-2 flex items-center gap-2 text-zinc-500">
                      <MapPin size={16} className="text-blue-500" />
                      Delivery Address
                    </label>
                    <LocationInput
                      value={packageInfo.destinationAddress}
                      onValueChange={(v) =>
                        setPackageInfo({ destinationAddress: v })
                      }
                      onLocationSelect={(location, address) => {
                        setLocations(undefined, location);
                        setPackageInfo({ destinationAddress: address });
                      }}
                      placeholder="Enter delivery address"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-1 dark:text-white">
                  Sender Information
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Your details — the courier will contact you at pickup.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailInput
                    label="Your Name (optional)"
                    icon={User}
                    placeholder="Your full name"
                    value={packageInfo.senderName}
                    onChange={(v) => setPackageInfo({ senderName: v })}
                  />
                  <DetailInput
                    label="Your Phone Number"
                    icon={Phone}
                    placeholder="08012345678"
                    value={packageInfo.senderPhone}
                    onChange={handleSenderPhoneChange}
                    error={senderPhoneError}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4 dark:text-white">
                  Recipient Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailInput
                    label="Recipient Name"
                    icon={User}
                    placeholder="Full name"
                    value={packageInfo.recipientName}
                    onChange={(v) => setPackageInfo({ recipientName: v })}
                  />
                  <DetailInput
                    label="Recipient Phone Number"
                    icon={Phone}
                    placeholder="08012345678"
                    value={packageInfo.recipientPhone}
                    onChange={handlePhoneChange}
                    error={phoneError}
                  />
                </div>
              </section>
            </div>

            {/* Right Column: Package Form */}
            <div className="lg:col-span-5 space-y-12">
              <section>
                <PackageForm onContinue={handleInitializeDelivery} />
              </section>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white transition-colors duration-500">
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-32">
        <header className="mb-16 flex justify-between items-start">
          <div className="space-y-2 text-left">
            <h1 className="text-4xl font-bold">Send a Package</h1>
            <p className="text-gray-500">Fast, reliable delivery service</p>
          </div>
        </header>

        {renderStageContent()}
      </main>
      <BottomNav />
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}

const DetailInput: React.FC<DetailInputProps> = ({
  label,
  icon: Icon,
  placeholder,
  value,
  onChange,
  error,
}) => (
  <div
    className={`border-b pb-2 transition-colors ${error ? "border-red-500" : "border-zinc-200 dark:border-white/10 focus-within:border-yellow-500"}`}
  >
    <label
      className={`flex items-center gap-2 text-sm font-medium mb-2 ${error ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"}`}
    >
      <Icon
        size={16}
        className={error ? "text-red-500" : "text-yellow-500/50"}
      />{" "}
      {label}
    </label>
    <input
      type="text"
      placeholder={placeholder}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-base font-normal outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);
