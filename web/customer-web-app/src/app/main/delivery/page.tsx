"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Wallet,
  CheckCircle2,
  User,
  Phone,
  ChevronLeft,
  X,
  History,
  Route,
  ShieldCheck,
  MapPinned,
  BadgeCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { deliverySwal } from "@/lib/swal-theme";
import { useSession } from "next-auth/react";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { LocationInput } from "@/components/shared/LocationInput";
import DeliveryProgressUI from "./components/DeliveryProgressUi";
import PackageForm from "./components/PackageForm"; // ✅ Imported new component
import { DeliveryMapPicker } from "./components/DeliveryMapPicker";
import { ReviewModal } from "@/store/ReviewModal";
import { DeliveryService, ParcelEstimate } from "@/services/delivery.service";
import { WalletService } from "@/services/wallet.service";
import {
  AddressService,
  type SavedAddress,
} from "@/services/address.service";
import { socketService } from "@/services/socket.service";
import {
  savePurchaseContext,
  trackMetaCustomEvent,
} from "@/lib/meta-pixel";

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
const PENDING_WALLET_TOPUP_KEY = "pending_wallet_topup";

interface DetailInputProps {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
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
  const cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.startsWith("+234")) return cleaned;
  if (cleaned.startsWith("234")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+234${cleaned.slice(1)}`;
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
    pickupAddressId,
    dropoffAddressId,
    setAddressIds,
    setStage,
    stage,
    activeDeliveryId,
    setCalculatedFee,
    calculatedFee,
    resetDelivery,
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [estimate, setEstimate] = useState<ParcelEstimate | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "CARD">("CARD");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("20000");
  const [isInitializingTopup, setIsInitializingTopup] = useState(false);
  const [mapPicker, setMapPicker] = useState<"pickup" | "dropoff" | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const idempotencyKeyRef = useRef<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const token = getAuthToken(session);
    if (!token) {
      setSavedAddresses([]);
      return;
    }

    AddressService.list(token)
      .then((items) =>
        setSavedAddresses(
          [...items].sort(
            (first, second) => Number(second.isDefault) - Number(first.isDefault),
          ),
        ),
      )
      .catch(() => setSavedAddresses([]));
  }, [session]);

  const selectSavedAddress = (
    kind: "pickup" | "dropoff",
    addressId: string,
  ) => {
    const address = savedAddresses.find((item) => item.id === addressId);
    if (!address) return;

    const position = { lat: address.latitude, lng: address.longitude };
    const displayAddress =
      [address.street, address.city, address.state].filter(Boolean).join(", ") ||
      `${address.latitude.toFixed(5)}, ${address.longitude.toFixed(5)}`;

    if (kind === "pickup") {
      setLocations(position, undefined);
      setAddressIds(address.id, undefined);
      setPackageInfo({ pickupAddress: displayAddress });
    } else {
      setLocations(undefined, position);
      setAddressIds(undefined, address.id);
      setPackageInfo({ destinationAddress: displayAddress });
    }
    setCalculatedFee(null);
    setEstimate(null);
  };

  const refreshWalletBalance = useCallback(async () => {
    const token = getAuthToken(session);
    if (!token) return;

    setWalletLoading(true);
    try {
      const wallet = await WalletService.getMyWallet(token);
      setWalletBalance(wallet.balance);
    } catch {
      setWalletBalance(null);
    } finally {
      setWalletLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (stage === DeliveryStage.REVIEW_PAYMENT) refreshWalletBalance();
  }, [stage, refreshWalletBalance]);

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
      } else {
        // Fallback: if delivery ID is lost, at least go to deliveries list
        // so the user can find their delivery instead of being stuck.
        router.push("/main/profile?tab=deliveries");
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
          setStage(DeliveryStage.REVIEW_PAYMENT);
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

        if (isVerified === true) {
          handlePaymentSuccess(id);
          return;
        }

        // ✅ FIXED: Check payment status to detect cancellation
        // If verification failed, try to determine WHY to provide appropriate UX
        let paymentStatus = "unknown";
        if (token) {
          try {
            const paymentData = await DeliveryService.getPaymentStatus(
              reference,
              gateway,
              token,
            );
            paymentStatus = paymentData.status || "unknown";
          } catch (err) {
            // Non-fatal — continue with polling
            console.warn("Could not fetch payment status:", err);
          }
        }

        // ✅ FIXED: Exit PAYMENT_PENDING if payment was explicitly cancelled
        if (paymentStatus === "CANCELLED") {
          toast.warn(
            "Payment was cancelled. You can start a new delivery or use this form again.",
          );
          setStage(DeliveryStage.REVIEW_PAYMENT); // Reset to payment review
          localStorage.removeItem(PENDING_DELIVERY_KEY);
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

        // ✅ FIXED: Exit PAYMENT_PENDING even if polling fails
        // (prevents indefinite stuck state)
        if (success) {
          handlePaymentSuccess(id);
        } else {
          // Polling failed — either payment timed out or backend unavailable
          toast.error(
            "Could not verify payment status. Please check your email for confirmation or try again.",
          );
          setStage(DeliveryStage.REVIEW_PAYMENT); // Reset to allow retry
          localStorage.removeItem(PENDING_DELIVERY_KEY);
        }
      } catch (e) {
        console.error("Failed to recover pending delivery state", e);
        // ✅ FIXED: Exit PAYMENT_PENDING on error
        if (
          useDeliveryStore.getState().stage === DeliveryStage.PAYMENT_PENDING
        ) {
          toast.warn(
            "Payment status unclear. Returning to delivery form to retry.",
          );
          setStage(DeliveryStage.REVIEW_PAYMENT);
        }
        localStorage.removeItem(PENDING_DELIVERY_KEY);
      }
    };

    recoverState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, handlePaymentSuccess]);

  // EVENT HANDLERS

  const handleSocketUpdate = useCallback(
    (data: any) => {
      // Parcel events use RIDER_* names; legacy delivery events use the
      // shorter equivalents. Both represent the same UI stages.
      if (
        ["ASSIGNED", "ACCEPTED", "RIDER_ASSIGNED", "RIDER_ACCEPTED"].includes(
          data.status,
        )
      ) {
        useDeliveryStore.setState({
          courierInfo: data.rider,
          stage: DeliveryStage.ASSIGNED,
        });
        toast.info("Courier found! They are on their way.");
      } else if (data.status === "PICKED_UP") {
        setStage(DeliveryStage.PICKED_UP);
        toast.info("Delivery picked up.");
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
    if (!packageInfo.recipientName || !packageInfo.recipientName.trim()) {
      await swal.fire({
        icon: "warning",
        title: "Recipient Name Required",
        html: `
          <p>Please enter the <strong>full name</strong> of the person receiving the delivery.</p>
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
      setStage(DeliveryStage.CALCULATING_FEE);

      // The backend prices and creates the parcel from pickup/dropoff
      // coordinates directly — no separate "save address, get an ID back"
      // step. Estimate here just previews the fare; the parcel itself (and
      // payment) is created in handlePayment once the user confirms.
      const estimate = await DeliveryService.estimateParcel(
        {
          latitude: pickupPos.lat,
          longitude: pickupPos.lng,
          address: sanitizeInput(packageInfo.pickupAddress),
        },
        {
          latitude: dropoffPos.lat,
          longitude: dropoffPos.lng,
          address: sanitizeInput(packageInfo.destinationAddress),
        },
        packageInfo.size,
        token,
      );

      setCalculatedFee(estimate.fare);
      setEstimate(estimate);
      setStage(DeliveryStage.REVIEW_PAYMENT);

      refreshWalletBalance();
    } catch (error: any) {
      console.error("Init Error:", error);
      toast.error(error.message || "Failed to initialize delivery.");
      setApiError(true);
      setStage(DeliveryStage.CONFIGURING);
    }
  };

  const handleWalletTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Enter a valid top-up amount.");
      return;
    }

    const token = getAuthToken(session);
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setIsInitializingTopup(true);
    try {
      const result = await WalletService.initializeTopup(amount, token);
      if (!result.authorizationUrl?.startsWith("https://checkout.paystack.com/")) {
        throw new Error("The payment link returned by the server is invalid.");
      }

      localStorage.setItem(
        PENDING_WALLET_TOPUP_KEY,
        JSON.stringify({ reference: result.reference, returnTo: "/main/delivery" }),
      );
      window.location.href = result.authorizationUrl;
    } catch (error: any) {
      toast.error(error?.message || "Could not initialize wallet top-up.");
      setIsInitializingTopup(false);
    }
  };

  const handlePayment = async () => {
    if (!pickupPos || !dropoffPos || !calculatedFee) return;
    const token = getAuthToken(session);
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (
      paymentMethod === "WALLET" &&
      walletBalance !== null &&
      walletBalance < calculatedFee
    ) {
      toast.error("Your wallet balance is not enough for this delivery.");
      return;
    }

    try {
      setStage(DeliveryStage.PAYMENT_PENDING);

      // The backend creates the parcel AND initiates payment in one call —
      // there's no separate "create, then initiate payment" step. For CARD
      // it returns a Paystack authorizationUrl directly.
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `parcel-${session?.user?.id ?? "customer"}-${Date.now()}`;
      }

      const result = await DeliveryService.createDelivery(
        {
          pickup: {
            latitude: pickupPos.lat,
            longitude: pickupPos.lng,
            address: sanitizeInput(packageInfo.pickupAddress),
          },
          dropoff: {
            latitude: dropoffPos.lat,
            longitude: dropoffPos.lng,
            address: sanitizeInput(packageInfo.destinationAddress),
          },
          size: packageInfo.size,
          recipientName: sanitizeInput(packageInfo.recipientName),
          recipientPhone: normalizePhoneNumber(packageInfo.recipientPhone),
          description: sanitizeInput(
            packageInfo.instructions || packageInfo.type,
          ),
          paymentMethod,
          idempotencyKey: idempotencyKeyRef.current,
        },
        token,
      );

      useDeliveryStore.setState({ activeDeliveryId: result.delivery.id });
      trackMetaCustomEvent(
        "DispatchRequest",
        {
          package_type: packageInfo.type,
          value: result.deliveryFee,
          currency: "NGN",
        },
        `dispatch:${result.delivery.id}`,
      );

      if (result.authorizationUrl) {
        savePurchaseContext({
          value: calculatedFee,
          currency: "NGN",
          contentCategory: "dispatch",
          contentId: result.delivery.id,
        });
        // The create endpoint may return only the Paystack URL. Keep the
        // delivery ID regardless; Paystack supplies the reference on return.
        localStorage.setItem(
          PENDING_DELIVERY_KEY,
          JSON.stringify({
            id: result.delivery.id,
            reference: result.reference ?? null,
            gateway: "PAYSTACK",
          }),
        );
        if (!result.authorizationUrl.startsWith("https://checkout.paystack.com/")) {
          throw new Error("The payment link returned by the server is invalid.");
        }
        window.location.href = result.authorizationUrl;
      } else {
        // WALLET — already paid, nothing to redirect to a gateway for.
        toast.success("Delivery requested and paid from your wallet!");
        resetDelivery();
        router.push(`/main/delivery/${result.delivery.id}`);
      }
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error(error.message || "Payment initialization failed");
      setStage(DeliveryStage.REVIEW_PAYMENT);
    }
  };

  const handleManualPaymentCheck = useCallback(async () => {
    if (activeDeliveryId) {
      setIsCheckingPayment(true);
      const token = getAuthToken(session);
      // Read stored gateway so verification uses the correct payment provider
      let gateway = "PAYSTACK";
      try {
        const stored = localStorage.getItem(PENDING_DELIVERY_KEY);
        if (stored) gateway = JSON.parse(stored).gateway || "PAYSTACK";
      } catch {}

      const storedRef = localStorage.getItem(PENDING_DELIVERY_KEY);
      const reference = storedRef ? JSON.parse(storedRef).reference : null;

      try {
        if (reference) {
          const isVerified = await DeliveryService.verifyPayment(
            reference,
            gateway,
            token || undefined,
          );
          if (isVerified === true) {
            handlePaymentSuccess();
            return;
          }
          // null = indeterminate (network error) — fall through to polling
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
      } finally {
        setIsCheckingPayment(false);
      }
    }
  }, [activeDeliveryId, handlePaymentSuccess, session]);

  const handleGoBack = useCallback(() => {
    setIsGoingBack(true);
    idempotencyKeyRef.current = null;
    // Update stage immediately, the state change will handle the transition
    setStage(DeliveryStage.CONFIGURING);
    // Use setTimeout to ensure the loader is seen briefly if transition is too fast
    setTimeout(() => setIsGoingBack(false), 300);
  }, [setStage]);

  const handleCancelDelivery = useCallback(async () => {
    if (!activeDeliveryId) {
      setStage(DeliveryStage.CONFIGURING);
      return;
    }

    const swal = deliverySwal();
    const result = await swal.fire({
      title: "Cancel Delivery?",
      text: "Are you sure you want to completely cancel this delivery request?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Cancel It",
      cancelButtonColor: "#ef4444",
      cancelButtonText: "No, Keep It",
    });

    if (result.isConfirmed) {
      setIsCancelling(true);
      const token = getAuthToken(session);
      try {
        await DeliveryService.cancelDelivery(
          activeDeliveryId,
          "User cancelled before payment",
          token || undefined,
        );
        toast.info("Delivery cancelled.");
      } catch (error) {
        console.error("Cancel Error:", error);
      } finally {
        idempotencyKeyRef.current = null;
        resetDelivery();
        setStage(DeliveryStage.CONFIGURING);
        setIsCancelling(false);
      }
    }
  }, [activeDeliveryId, resetDelivery, session, setStage]);

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

            <div className="mb-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full border-[3px] border-yellow-500 bg-white dark:bg-zinc-900" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pickup</p><p className="mt-1 truncate text-sm font-bold">{packageInfo.pickupAddress}</p></div></div>
              <div className="ml-[5px] h-5 border-l-2 border-dotted border-zinc-300 dark:border-zinc-600" />
              <div className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-blue-500" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Drop-off</p><p className="mt-1 truncate text-sm font-bold">{packageInfo.destinationAddress}</p></div></div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50 sm:p-6">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Amount to Pay
              </span>
              <span className="text-3xl font-black dark:text-white">
                ₦{calculatedFee?.toLocaleString()}
              </span>
            </div>

            {estimate && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Distance</p>
                  <p className="mt-1 text-sm font-black">{estimate.distanceKm.toFixed(1)} km</p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Duration</p>
                  <p className="mt-1 text-sm font-black">~{estimate.estimatedDurationMinutes} min</p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Size</p>
                  <p className="mt-1 text-sm font-black capitalize">{packageInfo.size.toLowerCase()}</p>
                </div>
              </div>
            )}

            <div className="mb-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-900/10">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                A suitable rider will be assigned automatically for this {packageInfo.size.toLowerCase()} delivery.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-400">Choose payment method</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "CARD"}
                    onClick={() => {
                      setPaymentMethod("CARD");
                      idempotencyKeyRef.current = null;
                    }}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${paymentMethod === "CARD" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10" : "border-zinc-200 dark:border-zinc-700"}`}
                  >
                    <CreditCard className="h-5 w-5 shrink-0 text-yellow-600" />
                    <div>
                      <p className="text-sm font-bold">Pay online</p>
                      <p className="text-xs text-zinc-400">Secure Paystack checkout</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "WALLET"}
                    onClick={() => {
                      setPaymentMethod("WALLET");
                      idempotencyKeyRef.current = null;
                      if (
                        walletBalance !== null &&
                        walletBalance < (calculatedFee ?? 0)
                      ) {
                        setShowTopup(true);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${paymentMethod === "WALLET" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10" : "border-zinc-200 dark:border-zinc-700"}`}
                  >
                    <Wallet className="h-5 w-5 shrink-0 text-yellow-600" />
                    <div>
                      <p className="text-sm font-bold">Wallet</p>
                      <p className={`text-xs ${walletBalance !== null && walletBalance < (calculatedFee ?? 0) ? "text-red-500" : "text-zinc-400"}`}>
                        {walletLoading ? "Checking balance…" : walletBalance === null ? "Balance unavailable" : `Balance: ₦${walletBalance.toLocaleString()}`}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {paymentMethod === "WALLET" && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold dark:text-white">
                        Need more wallet funds?
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Top up securely with Paystack, then return here to pay.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTopup((current) => !current)}
                      className="shrink-0 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-black text-yellow-700 transition hover:bg-yellow-500/20 dark:text-yellow-400"
                    >
                      {showTopup ? "Close" : "Top up"}
                    </button>
                  </div>

                  {showTopup && (
                    <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-zinc-500">
                          Top-up amount
                        </span>
                        <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 focus-within:border-yellow-500 dark:border-zinc-700 dark:bg-zinc-900">
                          <span className="font-bold text-zinc-500">₦</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            value={topupAmount}
                            onChange={(event) => setTopupAmount(event.target.value)}
                            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base font-black outline-none dark:text-white"
                            placeholder="20000"
                          />
                        </div>
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        {[5000, 10000, 20000].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setTopupAmount(String(amount))}
                            className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${topupAmount === String(amount) ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"}`}
                          >
                            ₦{amount.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleWalletTopup}
                        disabled={isInitializingTopup || !topupAmount}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
                      >
                        {isInitializingTopup && (
                          <Loader2 size={17} className="animate-spin" />
                        )}
                        {isInitializingTopup
                          ? "Opening Paystack…"
                          : "Continue to Paystack"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handlePayment}
                disabled={paymentMethod === "WALLET" && (walletLoading || walletBalance === null || walletBalance < (calculatedFee ?? 0))}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-4 font-black text-black shadow-lg transition-all hover:bg-yellow-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentMethod === "CARD" ? <CreditCard size={20} /> : <Wallet size={20} />}
                {paymentMethod === "CARD" ? "Pay online" : "Pay with wallet"}
              </button>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={handleGoBack}
                  disabled={isGoingBack || isCancelling}
                  className="py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGoingBack ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ChevronLeft size={18} />
                  )}
                  {isGoingBack ? "Returning..." : "Go Back"}
                </button>
                <button
                  onClick={handleCancelDelivery}
                  disabled={isGoingBack || isCancelling}
                  className="py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <X size={18} />
                  )}
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </button>
              </div>
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
              disabled={isCheckingPayment}
              className="mt-6 text-sm font-medium text-blue-500 hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-2 mx-auto"
            >
              {isCheckingPayment && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {isCheckingPayment ? "Checking..." : "I have completed payment"}
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
          <div className="grid grid-cols-1 gap-5 animate-in fade-in duration-500 lg:grid-cols-12 lg:gap-6">
            {/* Left Column: Addresses */}
            <div className="space-y-5 lg:col-span-7">
              <section className="rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151515] sm:p-7">
                <div className="mb-6 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-sm font-black text-black">1</span><div><h2 className="text-lg font-black">Pickup and drop-off</h2><p className="mt-1 text-xs text-zinc-500">Search an address or use your current location.</p></div></div>
                <div className="relative space-y-5">
                  <div className="absolute bottom-12 left-[7px] top-12 border-l-2 border-dotted border-zinc-200 dark:border-white/10" />
                  {/* Pickup Address */}
                  <div className="relative pl-6">
                    <span className="absolute left-0 top-10 h-3.5 w-3.5 rounded-full border-[3px] border-yellow-500 bg-white dark:bg-[#151515]" />
                    <div className="mb-2 flex items-center justify-between gap-3"><label className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Pickup location</label><button type="button" onClick={() => setMapPicker("pickup")} className="flex items-center gap-1.5 rounded-lg bg-yellow-50 px-2.5 py-1.5 text-[10px] font-black text-yellow-700 transition hover:bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400"><MapPinned className="h-3.5 w-3.5" /> Choose on map</button></div>
                    {savedAddresses.length > 0 && (
                      <select value={pickupAddressId || ""} onChange={(event) => event.target.value && selectSavedAddress("pickup", event.target.value)} className="mb-2 w-full rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-yellow-400 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-zinc-200">
                        <option value="">Use a saved pickup address</option>
                        {savedAddresses.map((address) => <option className="text-black" value={address.id} key={address.id}>{address.label}{address.isDefault ? " (Default)" : ""} — {address.street || address.city || "Pinned location"}</option>)}
                      </select>
                    )}
                    <LocationInput
                      value={packageInfo.pickupAddress}
                      onValueChange={(v) => {
                        setAddressIds(null, undefined);
                        setPackageInfo({ pickupAddress: v });
                      }}
                      onLocationSelect={(location, address) => {
                        setAddressIds(null, undefined);
                        setLocations(location, undefined);
                        setPackageInfo({ pickupAddress: address });
                      }}
                      placeholder="Enter pickup location"
                      showGeolocation
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="relative border-t border-black/5 pl-6 pt-5 dark:border-white/5">
                    <span className="absolute left-0 top-14 h-3.5 w-3.5 rounded-sm bg-blue-500" />
                    <div className="mb-2 flex items-center justify-between gap-3"><label className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Drop-off location</label><button type="button" onClick={() => setMapPicker("dropoff")} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400"><MapPinned className="h-3.5 w-3.5" /> Choose on map</button></div>
                    {savedAddresses.length > 0 && (
                      <select value={dropoffAddressId || ""} onChange={(event) => event.target.value && selectSavedAddress("dropoff", event.target.value)} className="mb-2 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-blue-400 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-zinc-200">
                        <option value="">Use a saved drop-off address</option>
                        {savedAddresses.map((address) => <option className="text-black" value={address.id} key={address.id}>{address.label}{address.isDefault ? " (Default)" : ""} — {address.street || address.city || "Pinned location"}</option>)}
                      </select>
                    )}
                    <LocationInput
                      value={packageInfo.destinationAddress}
                      onValueChange={(v) => {
                        setAddressIds(undefined, null);
                        setPackageInfo({ destinationAddress: v });
                      }}
                      onLocationSelect={(location, address) => {
                        setAddressIds(undefined, null);
                        setLocations(undefined, location);
                        setPackageInfo({ destinationAddress: address });
                      }}
                      placeholder="Enter delivery address"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151515] sm:p-7">
                <div className="mb-6 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-white dark:bg-white dark:text-black">2</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">Recipient details</h2><span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><BadgeCheck className="h-3 w-3" /> Delivery contact</span></div><p className="mt-1 text-xs leading-5 text-zinc-500">Add the person who will receive the item. The rider will use these details only for this delivery.</p></div></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailInput
                    label="Recipient Name"
                    icon={User}
                    placeholder="Full name"
                    value={packageInfo.recipientName}
                    onChange={(v) => setPackageInfo({ recipientName: v })}
                    autoComplete="name"
                  />
                  <DetailInput
                    label="Recipient Phone Number"
                    icon={Phone}
                    placeholder="08012345678"
                    value={packageInfo.recipientPhone}
                    onChange={handlePhoneChange}
                    error={phoneError}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-blue-50/70 p-3 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><p>Use a reachable Nigerian phone number. We’ll format local numbers such as <strong>0801…</strong> automatically when creating the delivery.</p></div>
              </section>
            </div>

            {/* Right Column: Delivery Form */}
            <div className="lg:col-span-5">
              <section className="rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151515] sm:p-7 lg:sticky lg:top-24">
                <div className="mb-6 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-white dark:bg-white dark:text-black">3</span><div><h2 className="text-lg font-black">Delivery details</h2><p className="mt-1 text-xs text-zinc-500">Choose a size and tell the rider what is inside.</p></div></div>
                <PackageForm onContinue={handleInitializeDelivery} />
              </section>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-900 transition-colors duration-500 dark:bg-[#0a0a0a] dark:text-white">
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
        <header className="mb-8 flex items-start justify-between sm:mb-12">
          <div className="space-y-2 text-left">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">Door-to-door delivery</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Send a delivery</h1>
            <p className="text-sm text-gray-500 sm:text-base">Enter the route, recipient and delivery size to get an instant estimate.</p>
          </div>
          <Link href="/main/profile?tab=deliveries" className="hidden items-center gap-2 rounded-xl border border-black/5 bg-white px-4 py-3 text-xs font-black shadow-sm hover:border-yellow-300 dark:border-white/10 dark:bg-[#151515] sm:flex"><History className="h-4 w-4" /> My deliveries</Link>
        </header>

        {(stage === DeliveryStage.IDLE || stage === DeliveryStage.CONFIGURING || stage === DeliveryStage.REVIEW_PAYMENT) && <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-black/5 bg-white p-2 dark:border-white/10 dark:bg-[#151515]"><div className={`flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${stage === DeliveryStage.IDLE || stage === DeliveryStage.CONFIGURING ? "bg-zinc-950 text-white dark:bg-white dark:text-black" : "text-emerald-600"}`}><Route className="h-4 w-4" /> Delivery details</div><div className="h-px w-6 shrink-0 bg-zinc-200 dark:bg-white/10" /><div className={`flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${stage === DeliveryStage.REVIEW_PAYMENT ? "bg-zinc-950 text-white dark:bg-white dark:text-black" : "text-zinc-400"}`}><CreditCard className="h-4 w-4" /> Review & pay</div><div className="h-px w-6 shrink-0 bg-zinc-200 dark:bg-white/10" /><div className="flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-zinc-400"><ShieldCheck className="h-4 w-4" /> Track delivery</div></div>}

        {renderStageContent()}
      </main>
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
      <DeliveryMapPicker
        open={mapPicker !== null}
        kind={mapPicker || "pickup"}
        initialPosition={mapPicker === "dropoff" ? dropoffPos : pickupPos}
        initialAddress={mapPicker === "dropoff" ? packageInfo.destinationAddress : packageInfo.pickupAddress}
        onClose={() => setMapPicker(null)}
        onConfirm={(position, address) => {
          if (mapPicker === "dropoff") {
            setAddressIds(undefined, null);
            setLocations(undefined, position);
            setPackageInfo({ destinationAddress: address });
          } else {
            setAddressIds(null, undefined);
            setLocations(position, undefined);
            setPackageInfo({ pickupAddress: address });
          }
          setCalculatedFee(null);
          setEstimate(null);
          setMapPicker(null);
        }}
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
  inputMode,
  autoComplete,
}) => (
  <div className={`rounded-2xl border bg-gray-50 p-3.5 transition-all focus-within:bg-white focus-within:ring-2 dark:bg-white/[0.03] dark:focus-within:bg-white/[0.05] ${error ? "border-red-400 focus-within:ring-red-500/15" : "border-black/[0.06] focus-within:border-yellow-400 focus-within:ring-yellow-400/15 dark:border-white/10"}`}>
    <label
      className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${error ? "text-red-500" : "text-zinc-400"}`}
    >
      <Icon
        size={16}
        className={error ? "text-red-500" : "text-yellow-500/50"}
      />{" "}
      {label}
    </label>
    <input
      type="text"
      inputMode={inputMode}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm font-bold outline-none text-zinc-900 dark:text-white placeholder:font-medium placeholder:text-zinc-400"
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);
