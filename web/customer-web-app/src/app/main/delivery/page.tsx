"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Package,
  ChevronRight,
  Box,
  Layers,
  Truck,
  Loader2,
  User,
  Phone,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import BottomNav from "../components/layout/BottomNav";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import LocationAutocomplete from "../ride/components/LocationAutocomplete";
import DeliverySelector from "./components/DeliverySelector";
import DeliveryProgressUI from "./components/DeliveryProgressUi";
import { ReviewModal } from "@/store/ReviewModal";
import { paymentService } from "@/services/payment.service";
import { DeliveryService } from "@/services/delivery.service";
import { socketService } from "@/services/socket.service";

// ===========================
// CONSTANTS & TYPES
// ===========================

const DeliveryStage = {
  IDLE: "IDLE",
  CONFIGURING: "CONFIGURING",
  PROCESSING_ADDRESS: "Processing_Address",
  CALCULATING_FEE: "Calculating_Fee",
  SELECTING_VEHICLE: "SELECTING_VEHICLE",
  PAYMENT_PENDING: "Payment_Pending",
  FINDING_COURIER: "FINDING_COURIER",
  COURIER_ASSIGNED: "COURIER_ASSIGNED",
  PICKED_UP: "PICKED_UP",
  COMPLETED: "COMPLETED",
} as const;

const PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;
const PAYMENT_POLL_MAX_ATTEMPTS = 30;
const PAYMENT_POLL_INTERVAL = 2000;
const PENDING_DELIVERY_KEY = "pending_delivery";

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

// ===========================
// UTILITIES
// ===========================

const getAuthToken = (session: any): string | null => {
  const typedSession = session as SessionWithToken;
  return typedSession?.accessToken || typedSession?.user?.accessToken || null;
};

const normalizePhoneNumber = (phone: string): string => {
  let cleaned = phone.trim();
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
  if (!phone) {
    return { valid: false, error: null };
  }

  const normalized = normalizePhoneNumber(phone);

  if (!PHONE_REGEX.test(normalized)) {
    return {
      valid: false,
      error: "Enter valid Nigerian number (e.g. 08012345678)",
    };
  }

  return { valid: true, error: null };
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input.trim().slice(0, maxLength);
};

// ===========================
// CUSTOM HOOKS
// ===========================

const useDeliverySocket = (
  activeDeliveryId: string | null,
  onUpdate: (data: any) => void,
) => {
  const { data: session } = useSession();

  useEffect(() => {
    const token = getAuthToken(session);

    if (!token || !activeDeliveryId) return;

    socketService.connect(token);

    const handleDeliveryUpdate = (data: any) => {
      console.log("Socket Update Received:", data);

      if (data.deliveryId === activeDeliveryId) {
        onUpdate(data);
      }
    };

    socketService.on("delivery_update", handleDeliveryUpdate);

    return () => {
      socketService.off("delivery_update", handleDeliveryUpdate);
    };
  }, [activeDeliveryId, session, onUpdate]);
};

const usePaymentPolling = () => {
  const [isPolling, setIsPolling] = useState(false);

  const pollPaymentStatus = useCallback(
    async (
      deliveryId: string,
      onSuccess: () => void,
      onFailure: () => void,
    ) => {
      setIsPolling(true);
      let attempts = 0;

      const poll = async () => {
        try {
          const success = await DeliveryService.pollDeliveryStatus(
            deliveryId,
            "REQUESTED",
          );

          if (success) {
            localStorage.removeItem(PENDING_DELIVERY_KEY);
            setIsPolling(false);
            onSuccess();
            return true;
          }

          attempts++;
          if (attempts >= PAYMENT_POLL_MAX_ATTEMPTS) {
            setIsPolling(false);
            onFailure();
            return false;
          }

          setTimeout(poll, PAYMENT_POLL_INTERVAL);
        } catch (error) {
          console.error("Polling error:", error);
          attempts++;
          if (attempts >= PAYMENT_POLL_MAX_ATTEMPTS) {
            setIsPolling(false);
            onFailure();
          } else {
            setTimeout(poll, PAYMENT_POLL_INTERVAL);
          }
        }
      };

      poll();
    },
    [],
  );

  return { pollPaymentStatus, isPolling };
};

// ===========================
// MAIN COMPONENT
// ===========================

export default function DeliveryPage() {
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
    resetDelivery,
    setAddressIds,
    setCalculatedFee,
    calculatedFee,
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<boolean>(false);
  const { data: session } = useSession();
  const { pollPaymentStatus, isPolling } = usePaymentPolling();

  // Socket event handler
  const handleSocketUpdate = useCallback(
    (data: any) => {
      if (data.status === "ASSIGNED") {
        useDeliveryStore.setState({
          courierInfo: data.rider,
          stage: DeliveryStage.COURIER_ASSIGNED,
        });
        toast.info("Courier found! They are on their way.");
      } else if (data.status === "PICKED_UP") {
        setStage(DeliveryStage.PICKED_UP);
        toast.info("Package has been picked up.");
      } else if (data.status === "DELIVERED" || data.status === "COMPLETED") {
        setStage(DeliveryStage.COMPLETED);
        toast.success("Delivery completed successfully!");
      }
    },
    [setStage],
  );

  // Initialize socket connection
  useDeliverySocket(activeDeliveryId, handleSocketUpdate);

  // Fallback polling on mount if there's a pending delivery
  useEffect(() => {
    const checkPendingDelivery = async () => {
      const hasPending = localStorage.getItem(PENDING_DELIVERY_KEY);

      if (
        hasPending &&
        activeDeliveryId &&
        stage === DeliveryStage.PAYMENT_PENDING
      ) {
        try {
          const success = await DeliveryService.pollDeliveryStatus(
            activeDeliveryId,
            "REQUESTED",
          );

          if (success) {
            localStorage.removeItem(PENDING_DELIVERY_KEY);
            setStage(DeliveryStage.FINDING_COURIER);
            toast.success("Payment confirmed! Finding courier...");
          }
        } catch (error) {
          console.error("Failed to check pending delivery", error);
        }
      }
    };

    checkPendingDelivery();
  }, []); // Run once on mount

  // Validate phone on change
  const handlePhoneChange = useCallback(
    (value: string) => {
      setPackageInfo({ recipientPhone: value });
      const validation = validatePhoneNumber(value);
      setPhoneError(validation.error);
    },
    [setPackageInfo],
  );

  // Form validation
  const isFormValid = useMemo(() => {
    return Boolean(
      pickupPos &&
      dropoffPos &&
      packageInfo.pickupAddress &&
      packageInfo.destinationAddress &&
      packageInfo.recipientName &&
      packageInfo.recipientPhone &&
      !phoneError &&
      validatePhoneNumber(packageInfo.recipientPhone).valid,
    );
  }, [pickupPos, dropoffPos, packageInfo, phoneError]);

  const packageSizes = [
    {
      id: "Small",
      label: "Small",
      icon: Package,
      type: "Document",
      radius: "rounded-lg",
      weightLabel: "< 5 kg",
      weightValue: 2.5,
    },
    {
      id: "Medium",
      label: "Medium",
      icon: Box,
      type: "Parcel",
      radius: "rounded-xl",
      weightLabel: "5-20 kg",
      weightValue: 12.5,
    },
    {
      id: "Large",
      label: "Large",
      icon: Layers,
      type: "Bulk",
      radius: "rounded-2xl",
      weightLabel: "20-50 kg",
      weightValue: 35,
    },
    {
      id: "XL",
      label: "Extra Large",
      icon: Truck,
      type: "Heavy",
      radius: "rounded-3xl",
      weightLabel: "50+ kg",
      weightValue: 60,
    },
  ];

  // Helper to get weight safely from selection
  const getSelectedWeight = (): number => {
    const selected = packageSizes.find((p) => p.type === packageInfo.type);
    return selected ? selected.weightValue : 2.5;
  };

  // ===========================
  // HANDLERS
  // ===========================

  const handleInitializeDelivery = async () => {
    if (!pickupPos || !dropoffPos) return;

    const phoneValidation = validatePhoneNumber(packageInfo.recipientPhone);
    if (!phoneValidation.valid) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setApiError(false);

    try {
      setStage(DeliveryStage.PROCESSING_ADDRESS);

      const cityFallback = "Lagos";

      const pickupRes = await DeliveryService.saveAddress({
        street: sanitizeInput(packageInfo.pickupAddress),
        city: cityFallback,
        lat: pickupPos.lat,
        lng: pickupPos.lng,
      });

      const dropoffRes = await DeliveryService.saveAddress({
        street: sanitizeInput(packageInfo.destinationAddress),
        city: cityFallback,
        lat: dropoffPos.lat,
        lng: dropoffPos.lng,
      });

      setAddressIds(pickupRes.id, dropoffRes.id);

      const normalizedPhone = normalizePhoneNumber(packageInfo.recipientPhone);

      setStage(DeliveryStage.CALCULATING_FEE);

      const deliveryRes = await DeliveryService.createDelivery({
        pickupAddressId: pickupRes.id,
        dropoffAddressId: dropoffRes.id,
        recipientName: sanitizeInput(packageInfo.recipientName),
        recipientPhone: normalizedPhone,
        packageDetails: sanitizeInput(
          `${packageInfo.type} - ${packageInfo.instructions || "No special instructions"}`,
          500,
        ),
        weightKg: getSelectedWeight(), // Use direct numeric value
      });

      if (deliveryRes?.delivery?.id) {
        useDeliveryStore.setState({
          activeDeliveryId: deliveryRes.delivery.id,
        });
        setCalculatedFee(deliveryRes.deliveryFee);
        setStage(DeliveryStage.SELECTING_VEHICLE);
      } else {
        throw new Error("Invalid server response");
      }
    } catch (error: any) {
      console.error("Delivery initialization error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to process delivery. Please try again.",
      );
      setApiError(true);
      setStage(DeliveryStage.CONFIGURING);
    }
  };

  const handlePayment = async () => {
    if (!activeDeliveryId || !calculatedFee) {
      toast.error("Invalid delivery state");
      return;
    }

    const token = getAuthToken(session);
    if (!token) {
      toast.error("You are not logged in. Please refresh the page.");
      return;
    }

    try {
      setStage(DeliveryStage.PAYMENT_PENDING);

      const userEmail = session?.user?.email || "";

      const paymentRes = await paymentService.initiatePayment(
        {
          amount: calculatedFee,
          email: userEmail,
          gateway: "PAYSTACK",
          method: "CARD",
          type: "DELIVERY",
          metadata: {
            deliveryId: activeDeliveryId,
            purpose: "DELIVERY_REQUEST",
          },
        },
        token,
      );

      if (paymentRes.authorizationUrl) {
        // Set flag for recovery on return
        localStorage.setItem(PENDING_DELIVERY_KEY, "true");

        // Use redirection instead of window.open to avoid popup blockers on mobile
        window.location.href = paymentRes.authorizationUrl;
      }
    } catch (error: any) {
      console.error("Payment Error:", error.response?.data || error);
      toast.error(
        error.response?.data?.message || "Payment initialization failed",
      );
      setStage(DeliveryStage.SELECTING_VEHICLE);
    }
  };

  const startPaymentMonitoring = useCallback(() => {
    if (!activeDeliveryId) return;

    pollPaymentStatus(
      activeDeliveryId,
      () => {
        setStage(DeliveryStage.FINDING_COURIER);
        toast.success("Payment confirmed! Finding courier...");
      },
      () => {
        toast.warning(
          "Payment validation timed out. Please check your payment status.",
        );
      },
    );
  }, [activeDeliveryId, pollPaymentStatus, setStage]);

  const handleManualPaymentCheck = useCallback(() => {
    if (activeDeliveryId && !isPolling) {
      startPaymentMonitoring();
    }
  }, [activeDeliveryId, isPolling, startPaymentMonitoring]);

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!activeDeliveryId) return;

    try {
      await DeliveryService.rateDelivery(
        activeDeliveryId,
        rating,
        sanitizeInput(comment, 1000),
      );
      toast.success("Review submitted successfully");
      setIsReviewModalOpen(false);
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error("Failed to submit review. Please try again.");
    }
  };

  const handleResetDelivery = useCallback(() => {
    localStorage.removeItem(PENDING_DELIVERY_KEY);
    resetDelivery();
    setStage(DeliveryStage.IDLE);
  }, [resetDelivery, setStage]);

  // ===========================
  // RENDER HELPERS
  // ===========================

  const renderStageContent = () => {
    if (apiError && stage === DeliveryStage.CONFIGURING) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
          <AlertCircle
            className="h-12 w-12 text-red-500 mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
            Connection Failed
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 text-center mb-6">
            We couldn't process your request. Please check your internet
            connection and try again.
          </p>
          <button
            onClick={handleInitializeDelivery}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            aria-label="Retry delivery initialization"
          >
            <RefreshCw size={18} /> Retry
          </button>
          <button
            onClick={() => setApiError(false)}
            className="mt-4 text-sm text-gray-500 underline hover:text-gray-700"
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
          <div
            className="flex flex-col items-center justify-center py-20 gap-4"
            role="status"
            aria-live="polite"
          >
            <Loader2
              size={48}
              className="animate-spin text-yellow-500"
              aria-hidden="true"
            />
            <div className="text-center">
              <p className="font-bold text-lg">Processing Logistics</p>
              <p className="text-sm text-gray-500">
                Calculating best route & delivery fee...
              </p>
            </div>
          </div>
        );

      case DeliveryStage.SELECTING_VEHICLE:
        return (
          <DeliverySelector
            basePrice={calculatedFee}
            onConfirm={(finalPrice) => {
              setCalculatedFee(finalPrice);
              handlePayment();
            }}
          />
        );

      case DeliveryStage.PAYMENT_PENDING:
        return (
          <div className="text-center py-20" role="status" aria-live="polite">
            <Loader2
              size={48}
              className="animate-spin text-blue-500 mx-auto mb-4"
              aria-hidden="true"
            />
            <h3 className="text-xl font-bold">Waiting for Payment</h3>
            <p className="text-sm text-gray-500 mt-2">
              You have been redirected to the payment gateway.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              We will automatically update when payment is confirmed.
            </p>
            <button
              onClick={handleManualPaymentCheck}
              disabled={isPolling}
              className="mt-6 text-sm font-medium text-blue-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Manually check payment status"
            >
              {isPolling ? "Checking..." : "I have completed payment"}
            </button>
          </div>
        );

      case DeliveryStage.FINDING_COURIER:
        return (
          <div
            className="max-w-md mx-auto py-24 text-center space-y-8 animate-in fade-in zoom-in-95"
            role="status"
            aria-live="polite"
          >
            <div className="relative flex justify-center">
              <Loader2
                size={48}
                className="animate-spin text-yellow-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-lg font-semibold mb-2">Finding Your Courier</p>
              <p className="text-zinc-500 dark:text-zinc-400">
                Connecting to courier network...
              </p>
            </div>
          </div>
        );

      case DeliveryStage.COURIER_ASSIGNED:
      case DeliveryStage.PICKED_UP:
        return <DeliveryProgressUI stage={stage} courier={courierInfo} />;

      case DeliveryStage.COMPLETED:
        return (
          <div className="text-center py-20">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold dark:text-white">
                Delivery Completed
              </h2>
              <p className="text-gray-500 mt-2">
                Your package has been successfully delivered
              </p>
            </div>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="mt-4 text-yellow-500 font-medium hover:underline"
            >
              Rate Your Courier
            </button>
            <button
              onClick={handleResetDelivery}
              className="mt-8 bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Start New Delivery
            </button>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
            <div className="lg:col-span-7 space-y-12">
              <section>
                <div className="relative space-y-8 mt-10">
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <label
                      htmlFor="pickup-location"
                      className="text-sm font-medium mb-2 block text-zinc-500"
                    >
                      Pickup Location
                    </label>
                    <LocationAutocomplete
                      placeholder="Current package location"
                      initialValue={packageInfo.pickupAddress}
                      onSelect={(data) => {
                        setLocations(
                          { lat: data.lat, lng: data.lng },
                          undefined,
                        );
                        setPackageInfo({ pickupAddress: data.address });
                      }}
                    />
                  </div>
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <label
                      htmlFor="dropoff-location"
                      className="text-sm font-medium mb-2 block text-zinc-500"
                    >
                      Delivery Address
                    </label>
                    <LocationAutocomplete
                      placeholder="Enter full delivery address"
                      initialValue={packageInfo.destinationAddress}
                      showPinpoint={false}
                      onSelect={(data) => {
                        setLocations(undefined, {
                          lat: data.lat,
                          lng: data.lng,
                        });
                        setPackageInfo({ destinationAddress: data.address });
                      }}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4">
                  Recipient Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailInput
                    label="Recipient Name"
                    icon={User}
                    placeholder="Full name"
                    value={packageInfo.recipientName}
                    onChange={(v: string) =>
                      setPackageInfo({ recipientName: v })
                    }
                  />
                  <DetailInput
                    label="Contact Number"
                    icon={Phone}
                    placeholder="08012345678"
                    value={packageInfo.recipientPhone}
                    onChange={handlePhoneChange}
                    error={phoneError}
                  />
                </div>
              </section>
            </div>

            <div className="lg:col-span-5 space-y-12">
              <section>
                <h3 className="text-lg font-semibold mb-4">Package Size</h3>
                <div className="grid grid-cols-2 gap-4">
                  {packageSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() =>
                        setPackageInfo({
                          type: size.type,
                          weight: size.weightLabel,
                        })
                      }
                      className={`p-6 border transition-all duration-300 text-left flex flex-col gap-4 ${size.radius} ${
                        packageInfo.type === size.type
                          ? "border-yellow-500 bg-yellow-500/5 shadow-md"
                          : "border-zinc-200 dark:border-white/10 hover:border-yellow-500/50"
                      }`}
                      aria-pressed={packageInfo.type === size.type}
                      aria-label={`Select ${size.label} package size, ${size.weightLabel}`}
                    >
                      <size.icon
                        className={`w-6 h-6 ${packageInfo.type === size.type ? "text-yellow-500" : "text-zinc-400"}`}
                      />
                      <div>
                        <p className="text-base font-medium">{size.label}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {size.weightLabel}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={handleInitializeDelivery}
                  disabled={!isFormValid}
                  className="w-full group bg-zinc-900 dark:bg-white hover:bg-yellow-500 dark:hover:bg-yellow-500 text-white dark:text-black py-4 px-6 flex items-center justify-between transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                  aria-label={
                    isFormValid
                      ? "Proceed to calculate delivery price"
                      : "Complete all required fields to continue"
                  }
                >
                  <span className="font-medium">
                    {isFormValid
                      ? "Calculate Price & Proceed"
                      : "Complete All Fields"}
                  </span>
                  <ChevronRight
                    size={20}
                    className="transition-transform group-hover:translate-x-2"
                  />
                </button>
              </div>
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

// ===========================
// SUB-COMPONENTS
// ===========================

const DetailInput: React.FC<DetailInputProps> = ({
  label,
  icon: Icon,
  placeholder,
  value,
  onChange,
  error,
}) => (
  <div
    className={`border-b pb-2 transition-colors ${
      error
        ? "border-red-500"
        : "border-zinc-200 dark:border-white/10 focus-within:border-yellow-500"
    }`}
  >
    <label
      className={`flex items-center gap-2 text-sm font-medium mb-2 ${
        error ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <Icon
        size={16}
        className={error ? "text-red-500" : "text-yellow-500/50"}
      />
      {label}
    </label>
    <input
      type="text"
      placeholder={placeholder}
      className="w-full bg-transparent text-base font-normal outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      aria-describedby={error ? `${label}-error` : undefined}
    />
    {error && (
      <p
        id={`${label}-error`}
        className="text-xs text-red-500 mt-1"
        role="alert"
      >
        {error}
      </p>
    )}
  </div>
);
