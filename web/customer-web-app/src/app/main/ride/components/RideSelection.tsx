"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { useRideStore } from "../store/ride";
import { RideService, PriceEstimate } from "@/services/ride.service";
import { normalizeApiError } from "@/services/normalize-api-error";
import { validateFareEstimatePayload } from "@/services/validate-fare-estimate-payload";
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";
import { useDebounce } from "../hooks/useDebounce";
import { SidebarSection, SidebarDivider } from "./Sidebar";
import { PrimaryButton, SecondaryButton, Text } from "@/components/ui";
import {
  X,
  RotateCcw,
  Loader2,
  Clock,
  Route,
  User,
  Users,
  CreditCard,
  Wallet,
  MapPinned,
  Navigation,
} from "lucide-react";
import { trackMetaCustomEvent } from "@/lib/meta-pixel";
import { WalletService } from "@/services/wallet.service";

/**
 * Retry a transient-failure-prone async operation (H2 fix).
 *
 * Retries up to `attempts` times with `delayMs` spacing.
 * Client errors (4xx) are not retried — except 408 (Request Timeout)
 * and 429 (Too Many Requests), which are network/capacity issues.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status: number | undefined = err?.status ?? err?.response?.status;
      // Don't retry definitive 4xx failures (validation, auth, not-found …)
      // but DO retry on 408 (timeout) and 429 (rate-limit).
      if (
        status &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 429
      ) {
        throw err;
      }
      if (i < attempts - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}

export function RideSelection() {
  const { data: session } = useSession();

  // --- Store Selectors ---
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setRideType = useRideStore((state) => state.setRideType);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);
  const setRideId = useRideStore((state) => state.setRideId);
  const clearPickupLocation = useRideStore(
    (state) => state.clearPickupLocation,
  );
  const clearDropoffLocation = useRideStore(
    (state) => state.clearDropoffLocation,
  );
  const setStartOtp = useRideStore((state) => state.setStartOtp);
  const setLockedEstimate = useRideStore((state) => state.setLockedEstimate);
  const setPaymentConfirmed = useRideStore(
    (state) => state.setPaymentConfirmed,
  );

  // --- Global Address Setters ---
  const setPickupAddressStore = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddressStore = useRideStore(
    (state) => state.setDropoffAddress,
  );
  
  // --- Passenger State ---
  const passengerName = useRideStore((state) => state.passengerName);
  const passengerPhone = useRideStore((state) => state.passengerPhone);
  const setPassengerName = useRideStore((state) => state.setPassengerName);
  const setPassengerPhone = useRideStore((state) => state.setPassengerPhone);
  const [bookingForOther, setBookingForOther] = useState(false);
  const [passengerEmail, setPassengerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "WALLET">(
    "WALLET",
  );
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("20000");
  const [topupLoading, setTopupLoading] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  // New Selectors for Map Control
  const mapInstance = useRideStore((state) => state.mapInstance);
  const isGoogleMapsLoaded = useRideStore((state) => state.isGoogleMapsLoaded);
  const setRoutePolyline = useRideStore((state) => state.setRoutePolyline);
  const setIsConfiguring = useRideStore((state) => state.setIsConfiguring);

  // --- Address State from Zustand ---
  const pickupAddress = useRideStore((state) => state.pickupAddress || "");
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const dropoffAddress = useRideStore((state) => state.dropoffAddress || "");
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<Record<
    string,
    PriceEstimate
  > | null>(null);
  // Fare confirmation: set when user taps Book Ride, cleared on cancel or location change
  const [pendingBooking, setPendingBooking] = useState<{
    rideType: "economy";
    estimate: PriceEstimate;
  } | null>(null);

  // --- AbortControllers for Request Cancellation ---
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  const estimateAbortControllerRef = useRef<AbortController | null>(null);

  const debouncedPickup = useDebounce(pickupLocation, 500);
  const debouncedDropoff = useDebounce(dropoffLocation, 500);

  // Clear pending confirmation whenever locations change (stale fare protection)
  useEffect(() => {
    setPendingBooking(null);
    idempotencyKeyRef.current = null;
  }, [debouncedPickup, debouncedDropoff]);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    setWalletLoading(true);
    WalletService.getMyWallet(token)
      .then((wallet) => setWalletBalance(wallet.balance))
      .catch(() => setWalletBalance(null))
      .finally(() => setWalletLoading(false));
  }, [session?.accessToken]);

  // --- 1. Effect: Calculate Route Visuals (The Blue Line) ---
  useEffect(() => {
    if (
      !isGoogleMapsLoaded ||
      !mapInstance ||
      !debouncedPickup ||
      !debouncedDropoff
    )
      return;

    const calculateRoute = async () => {
      const directionsService = new google.maps.DirectionsService();

      try {
        const result = await directionsService.route({
          origin: debouncedPickup,
          destination: debouncedDropoff,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (result.routes[0]?.overview_polyline) {
          setRoutePolyline(result.routes[0].overview_polyline);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(debouncedPickup);
          bounds.extend(debouncedDropoff);
          mapInstance.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 250,
            left: 50,
          });
        }
      } catch (error) {
        console.error("Directions request failed", error);
      }
    };

    calculateRoute();
  }, [
    debouncedPickup,
    debouncedDropoff,
    isGoogleMapsLoaded,
    mapInstance,
    setRoutePolyline,
  ]);

  // --- 2. Effect: Fetch Backend Prices ---
  useEffect(() => {
    async function fetchEstimates() {
      if (!debouncedPickup || !debouncedDropoff || !session?.accessToken)
        return;

      estimateAbortControllerRef.current?.abort();

      const controller = new AbortController();
      estimateAbortControllerRef.current = controller;

      setIsCalculating(true);
      setEstimateError(null);
      try {
        const estimatePayload = {
          pickupLat: debouncedPickup.lat,
          pickupLng: debouncedPickup.lng,
          dropoffLat: debouncedDropoff.lat,
          dropoffLng: debouncedDropoff.lng,
          pickupAddress,
          dropoffAddress,
        };

        try {
          validateFareEstimatePayload(estimatePayload);
        } catch (validationError) {
          const msg =
            validationError instanceof Error
              ? validationError.message
              : "Invalid fare estimate payload";
          setEstimateError(msg);
          setIsCalculating(false);
          return;
        }

        const data = await RideService.getEstimate(
          estimatePayload,
          session.accessToken,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setEstimates(data);
          setEstimateError(null);
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to get estimates:", error);
        if (!controller.signal.aborted) {
          const msg =
            error?.type === "network-error"
              ? "Cannot reach server. Is the backend running? Tap to retry."
              : error?.type === "timeout"
                ? "Request timed out. Tap to retry."
                : error?.message || "Failed to load ride prices. Tap to retry.";
          setEstimateError(msg);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculating(false);
        }
      }
    }

    fetchEstimates();

    return () => {
      estimateAbortControllerRef.current?.abort();
    };
  }, [
    debouncedPickup,
    debouncedDropoff,
    session?.accessToken,
    pickupAddress,
    dropoffAddress,
  ]);

  // --- Booking Handler (called only after the user confirms on the confirmation panel) ---
  const handleRideRequest = async (
    rideType: "economy",
    lockedEstimate: PriceEstimate,
  ) => {
    if (!pickupLocation || !dropoffLocation) {
      toast.error("Please select both pickup and dropoff locations");
      return;
    }
    if (!session?.accessToken) {
      toast.error("You must be logged in to book a ride");
      return;
    }

    setIsSubmitting(true);
    setRideType(rideType);
    // Store the locked fare so the post-match payment screen can display it
    setLockedEstimate({
      fare: lockedEstimate.estimatedFare,
      distance: lockedEstimate.distance,
      duration: lockedEstimate.duration,
    });
    // Reset any previous payment confirmation flag for this new booking
    setPaymentConfirmed(false);

    try {
      const vehicleKey = "SEDAN";
      // Use the locked estimate from the confirmation screen — prevents stale fare surprises
      const selectedEstimate = lockedEstimate;

      if (
        paymentMethod === "WALLET" &&
        (walletBalance === null ||
          walletBalance < selectedEstimate.estimatedFare)
      ) {
        toast.error("Your wallet balance is not enough for this ride.");
        setShowTopup(true);
        setIsSubmitting(false);
        return;
      }

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `ride-${session.user.id}-${Date.now()}`;
      }

      const normalizePhone = (value: string | null) => {
        if (!value) return null;
        const cleaned = value.replace(/[\s-]/g, "");
        if (cleaned.startsWith("+234")) return cleaned;
        if (cleaned.startsWith("234")) return `+${cleaned}`;
        if (cleaned.startsWith("0")) return `+234${cleaned.slice(1)}`;
        return cleaned;
      };

      const payload = {
        pickup: {
          address: pickupAddress || "Pinned location",
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng,
        },
        dropoff: {
          address: dropoffAddress || "Pinned location",
          latitude: dropoffLocation.lat,
          longitude: dropoffLocation.lng,
        },
        vehicleType: vehicleKey,
        paymentMethod,
        isScheduled: false,
        idempotencyKey: idempotencyKeyRef.current,
        bookedForOther: bookingForOther,
        passengerName: bookingForOther ? passengerName : null,
        passengerPhone: bookingForOther
          ? normalizePhone(passengerPhone)
          : null,
        passengerEmail: bookingForOther ? passengerEmail.trim() || null : null,
      };

      const accessToken = session.accessToken as string; // already guarded above
      // Retry up to 3× on network/server errors; 4xx (except 408/429) rethrown immediately (H2 fix)
      const response = await withRetry(
        () => RideService.createRide(payload, accessToken),
        3,
        1000,
      );
      trackMetaCustomEvent(
        "RideBooking",
        {
          booking_type: bookingForOther ? "guest" : "self",
          vehicle_type: vehicleKey,
          value: selectedEstimate.estimatedFare,
          currency: "NGN",
        },
        `ride:${response.ride.id}`,
      );
      if (setRideId) setRideId(response.ride.id);
      // Store OTP so it can be shown to the driver when they arrive
      if (response.pickupCode) setStartOtp(response.pickupCode);

      // Driver matching begins on the backend after createRide.
      // confirmRide is called later from PostDriverPayment after DRIVER_FOUND.
      if (response.authorizationUrl) {
        if (!response.authorizationUrl.startsWith("https://checkout.paystack.com/")) {
          throw new Error("The payment link returned by the server is invalid.");
        }
        localStorage.setItem("pending_ride", "true");
        localStorage.setItem("pending_ride_id", response.ride.id);
        window.location.href = response.authorizationUrl;
      } else {
        setRideStatus("searching");
      }
    } catch (error: any) {
      const norm = normalizeApiError(error);
      console.error("Booking failed:", JSON.stringify(norm, null, 2));

      // Surface specific, user-friendly messages based on error type
      const userMessage =
        error?.type === "network-error"
          ? "Cannot reach the server. Please check your connection and try again."
          : error?.type === "timeout"
            ? "The request timed out. Please try again."
            : norm.message || "Failed to request ride. Please try again.";

      toast.error(userMessage);
      setRideStatus("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalletTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Enter a valid top-up amount.");
      return;
    }
    if (!session?.accessToken) return;

    setTopupLoading(true);
    try {
      const result = await WalletService.initializeTopup(
        amount,
        session.accessToken,
      );
      if (!result.authorizationUrl.startsWith("https://checkout.paystack.com/")) {
        throw new Error("The payment link returned by the server is invalid.");
      }
      localStorage.setItem(
        "pending_wallet_topup",
        JSON.stringify({ reference: result.reference, returnTo: "/main/ride" }),
      );
      window.location.href = result.authorizationUrl;
    } catch (error: any) {
      toast.error(error?.message || "Could not initialize wallet top-up.");
      setTopupLoading(false);
    }
  };

  // --- Show the confirmation panel when user taps Book Ride ---
  const handleSelectRide = () => {
    const estimate = estimates?.["ECONOMY"];
    if (!estimate) {
      toast.error("Fare estimate not available. Please wait for calculation.");
      return;
    }
    setPendingBooking({ rideType: "economy", estimate });
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);

  const formatDuration = (minutes: number) => Math.ceil(minutes) + " min";

  // --- 3. Clear Location Handlers ---
  const handleClearPickup = () => {
    routeAbortControllerRef.current?.abort();
    routeAbortControllerRef.current = null; // L6: release resolved controller reference
    estimateAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current = null; // L6
    clearPickupLocation();
    setPickupAddress("");
    setEstimates(null);
    toast.info("Pickup location cleared");
  };

  const handleClearDropoff = () => {
    routeAbortControllerRef.current?.abort();
    routeAbortControllerRef.current = null; // L6: release resolved controller reference
    estimateAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current = null; // L6
    clearDropoffLocation();
    setDropoffAddress("");
    setEstimates(null);
    toast.info("Dropoff location cleared");
  };

  return (
    <>
      <div className="px-4 pb-3 pt-5 sm:px-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-500/20"><Navigation className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Ride now</p><h1 className="mt-0.5 text-2xl font-black tracking-tight text-gray-950 dark:text-white">Where are you going?</h1><p className="mt-1 text-xs leading-5 text-gray-500">Choose your route to see a confirmed fare.</p></div>
        </div>

        <div className="relative rounded-3xl border border-black/[0.06] bg-gray-50 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="absolute bottom-[72px] left-[26px] top-[42px] w-px border-l-2 border-dotted border-gray-300 dark:border-white/15" />
          <div className="relative flex gap-3 pb-3">
            <span className="mt-5 h-3 w-3 shrink-0 rounded-full border-[3px] border-yellow-500 bg-white dark:bg-zinc-900" />
            <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pickup</label><button type="button" onClick={() => setIsConfiguring("pickup")} className="flex items-center gap-1 text-[10px] font-black text-yellow-700 dark:text-yellow-400"><MapPinned className="h-3.5 w-3.5" /> Map</button></div><div className="flex items-center gap-1"><div className="min-w-0 flex-1"><LocationAutocompleteInput type="pickup" onLocationSelect={(loc, address) => { setPickupLocation(loc); setPickupAddress(address); setPickupAddressStore(address); }} initialValue={pickupLocation ? pickupAddress || "Current pickup" : ""} /></div>{pickupLocation && <button onClick={handleClearPickup} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Clear pickup location"><X size={17} /></button>}</div></div>
          </div>
          <div className="relative flex gap-3 border-t border-black/5 pt-3 dark:border-white/5">
            <span className="mt-5 h-3 w-3 shrink-0 rounded-sm bg-blue-500" />
            <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Destination</label><button type="button" onClick={() => setIsConfiguring("dropoff")} className="flex items-center gap-1 text-[10px] font-black text-yellow-700 dark:text-yellow-400"><MapPinned className="h-3.5 w-3.5" /> Map</button></div><div className="flex items-center gap-1"><div className="min-w-0 flex-1"><LocationAutocompleteInput type="dropoff" onLocationSelect={(loc, address) => { setDropoffLocation(loc); setDropoffAddress(address); setDropoffAddressStore(address); }} initialValue={dropoffLocation ? dropoffAddress || "Destination" : ""} /></div>{dropoffLocation && <button onClick={handleClearDropoff} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Clear destination"><X size={17} /></button>}</div></div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2"><span className="rounded-full bg-gray-950 px-3 py-1.5 text-[10px] font-black text-white dark:bg-white dark:text-black">1 · Route</span><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${pickupLocation && dropoffLocation ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400" : "bg-gray-100 text-gray-400 dark:bg-white/5"}`}>2 · Ride & payment</span><span className="rounded-full bg-gray-100 px-3 py-1.5 text-[10px] font-black text-gray-400 dark:bg-white/5">3 · Confirm</span></div>
      </div>

      {/* Fare Estimates & Ride Selection - Show once both locations are set */}
      {pickupLocation && dropoffLocation && (
        <>
          <SidebarDivider />

          {/* Loading state */}
          {isCalculating && !estimates && (
            <SidebarSection title="Select Ride">
              <div className="flex items-center justify-center h-20 text-zinc-500 dark:text-zinc-400">
                <RotateCcw size={18} className="animate-spin mr-2" />
                <Text size="sm" variant="secondary">
                  Calculating fares...
                </Text>
              </div>
            </SidebarSection>
          )}

          {/* Error state with retry */}
          {estimateError && !isCalculating && (
            <SidebarSection title="Select Ride">
              <button
                onClick={() => {
                  setEstimateError(null);
                  setEstimates(null);
                  // Trigger re-fetch by clearing and resetting the estimate abort controller
                  estimateAbortControllerRef.current?.abort();
                  const controller = new AbortController();
                  estimateAbortControllerRef.current = controller;
                  if (
                    debouncedPickup &&
                    debouncedDropoff &&
                    session?.accessToken
                  ) {
                    setIsCalculating(true);
                    RideService.getEstimate(
                      {
                        pickupLat: debouncedPickup.lat,
                        pickupLng: debouncedPickup.lng,
                        dropoffLat: debouncedDropoff.lat,
                        dropoffLng: debouncedDropoff.lng,
                      },
                      session.accessToken,
                      controller.signal,
                    )
                      .then((data) => {
                        if (!controller.signal.aborted) {
                          setEstimates(data);
                          setEstimateError(null);
                        }
                      })
                      .catch((err) => {
                        if (
                          err.name !== "AbortError" &&
                          !controller.signal.aborted
                        ) {
                          const msg =
                            err?.type === "network-error"
                              ? "Cannot reach server. Is the backend running? Tap to retry."
                              : err?.type === "timeout"
                                ? "Request timed out. Tap to retry."
                                : err?.message ||
                                  "Failed to load ride prices. Tap to retry.";
                          setEstimateError(msg);
                        }
                      })
                      .finally(() => {
                        if (!controller.signal.aborted) setIsCalculating(false);
                      });
                  }
                }}
                className="flex items-center justify-center h-20 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <Text size="sm" className="text-red-600 dark:text-red-400">
                  {estimateError}
                </Text>
              </button>
            </SidebarSection>
          )}

          {/* Estimates loaded — show confirmation panel OR payment method + ride selection */}
          {estimates && (
            <>
              {pendingBooking ? (
                /* ── Fare Confirmation Panel ──────────────────────────── */
                <SidebarSection title="Confirm Booking">
                  {/* Route summary */}
                  <div className="w-full space-y-2 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        From
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                        {pickupAddress || "Pickup location"}
                      </p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-white/10 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        To
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                        {dropoffAddress || "Dropoff location"}
                      </p>
                    </div>
                  </div>

                  {/* Fare details */}
                  <div className="w-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400">Trip estimate</p>
                        <p className="mt-1 text-xs font-bold text-gray-600 dark:text-gray-300">
                          {pendingBooking.estimate.distance.toFixed(1)} km &middot; {formatDuration(pendingBooking.estimate.duration)}
                        </p>
                      </div>
                      <span className="text-xl font-black text-gray-900 dark:text-white">
                        {formatMoney(pendingBooking.estimate.estimatedFare)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-amber-600 dark:text-amber-500 font-medium w-full">
                    ✓ Confirmed fare — you will not be charged more than this
                    amount.
                  </p>

                  {/* Who Is Riding Toggle */}
                  <div className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl p-3 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {bookingForOther ? <Users size={16} className="text-gray-500" /> : <User size={16} className="text-gray-500" />}
                        <Text size="sm" weight="medium">Booking for someone else?</Text>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={bookingForOther}
                          onChange={(e) => {
                            setBookingForOther(e.target.checked);
                            if (!e.target.checked) {
                              setPassengerName(null);
                              setPassengerPhone(null);
                              setPassengerEmail("");
                            }
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
                      </label>
                    </div>
                    {bookingForOther && (
                      <div className="space-y-4 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <input
                          type="text"
                          placeholder="Passenger Name"
                          className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                          value={passengerName || ""}
                          onChange={(e) => setPassengerName(e.target.value)}
                        />
                        <input
                          type="tel"
                          placeholder="Passenger Phone"
                          className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                          value={passengerPhone || ""}
                          onChange={(e) => setPassengerPhone(e.target.value)}
                        />
                        <input
                          type="email"
                          placeholder="Passenger Email (optional)"
                          className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                          value={passengerEmail}
                          onChange={(e) => setPassengerEmail(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                      Payment method
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-pressed={paymentMethod === "WALLET"}
                        onClick={() => {
                          setPaymentMethod("WALLET");
                          idempotencyKeyRef.current = null;
                        }}
                        className={`rounded-xl border-2 p-3 text-left ${paymentMethod === "WALLET" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10" : "border-gray-200 dark:border-white/10"}`}
                      >
                        <Wallet className="mb-2 h-5 w-5 text-yellow-600" />
                        <p className="text-xs font-black">Wallet</p>
                        <p className={`mt-1 text-[10px] ${walletBalance !== null && walletBalance < pendingBooking.estimate.estimatedFare ? "text-red-500" : "text-gray-400"}`}>
                          {walletLoading
                            ? "Checking…"
                            : walletBalance === null
                              ? "Unavailable"
                              : `₦${walletBalance.toLocaleString()}`}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-pressed={paymentMethod === "CARD"}
                        onClick={() => {
                          setPaymentMethod("CARD");
                          idempotencyKeyRef.current = null;
                        }}
                        className={`rounded-xl border-2 p-3 text-left ${paymentMethod === "CARD" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10" : "border-gray-200 dark:border-white/10"}`}
                      >
                        <CreditCard className="mb-2 h-5 w-5 text-yellow-600" />
                        <p className="text-xs font-black">Pay online</p>
                        <p className="mt-1 text-[10px] text-gray-400">Paystack</p>
                      </button>
                    </div>

                    {paymentMethod === "WALLET" && (
                      <div className="border-t border-gray-100 pt-3 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => setShowTopup((current) => !current)}
                          className="text-xs font-black text-yellow-700 dark:text-yellow-400"
                        >
                          {showTopup ? "Close top-up" : "Top up wallet"}
                        </button>
                        {showTopup && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center rounded-xl border border-gray-200 px-3 dark:border-white/10">
                              <span className="font-bold text-gray-400">₦</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                value={topupAmount}
                                onChange={(event) => setTopupAmount(event.target.value)}
                                className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm font-black outline-none"
                                aria-label="Wallet top-up amount"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[5000, 10000, 20000].map((amount) => (
                                <button
                                  key={amount}
                                  type="button"
                                  onClick={() => setTopupAmount(String(amount))}
                                  className="rounded-lg border border-gray-200 py-2 text-[10px] font-bold dark:border-white/10"
                                >
                                  ₦{amount.toLocaleString()}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleWalletTopup}
                              disabled={topupLoading || !topupAmount}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-black"
                            >
                              {topupLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              {topupLoading ? "Opening Paystack…" : "Continue to Paystack"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <SecondaryButton
                      onClick={() => setPendingBooking(null)}
                      disabled={
                        isSubmitting ||
                        (bookingForOther &&
                          (!passengerName?.trim() || !passengerPhone?.trim())) ||
                        (paymentMethod === "WALLET" &&
                          (walletLoading ||
                            walletBalance === null ||
                            walletBalance <
                              pendingBooking.estimate.estimatedFare))
                      }
                      className="!text-yellow-700 dark:!text-yellow-500 hover:!bg-yellow-50 dark:hover:!bg-yellow-900/20 focus:ring-yellow-500"
                    >
                      ← Change
                    </SecondaryButton>
                    <PrimaryButton
                      onClick={() =>
                        handleRideRequest(
                          pendingBooking.rideType,
                          pendingBooking.estimate,
                        )
                      }
                      disabled={isSubmitting}
                      className="!bg-yellow-600 hover:!bg-yellow-700 !text-white focus:ring-yellow-500"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Booking...
                        </span>
                      ) : (
                        paymentMethod === "CARD"
                          ? "Book & Pay online"
                          : "Book with wallet"
                      )}
                    </PrimaryButton>
                  </div>
                </SidebarSection>
              ) : (
                /* ── Ride Selection ─────────────────────────────── */
                <SidebarSection title="Select Ride">
                  <div className="w-full">
                    <PrimaryButton
                      onClick={handleSelectRide}
                      disabled={isSubmitting || isCalculating}
                      className="w-full flex flex-col items-center justify-center !bg-yellow-600 hover:!bg-yellow-700 !text-white focus:ring-yellow-500 py-4"
                    >
                      {isCalculating ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <Text size="xs" className="!text-white/80">
                            Calculating fare...
                          </Text>
                        </span>
                      ) : (
                        <>
                          {estimates?.["ECONOMY"] && (
                            <div className="flex w-full items-center justify-between gap-3 px-1">
                              <div className="flex items-center gap-3 text-left">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-white/90"><Route size={15} />{estimates["ECONOMY"].distance.toFixed(1)} km</span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-white/90"><Clock size={15} />{formatDuration(estimates["ECONOMY"].duration)}</span>
                              </div>
                              <span className="text-base font-black text-white">{formatMoney(estimates["ECONOMY"].estimatedFare)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </SidebarSection>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
