"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore, CartItem } from "@/store/useCartStore";
import { useSession } from "next-auth/react";
import { WifiOff, Loader2, Phone, MapPin, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { ApiService } from "@/services/api.service";
import { savePurchaseContext } from "@/lib/meta-pixel";

// Components
import { Address } from "./types";
import { AddAddressModal } from "@/app/main/components/checkout/addadressmodal";
import { CartItemsList } from "@/app/main/components/checkout/cartitemslist";
import { OrderSummary } from "@/app/main/components/checkout/ordersummary";
import { AddressPickerModal } from "@/app/main/components/checkout/address-picker-modal";

// The backend prices and places orders from its own server-side cart
// (/cart/items), not from a list of items sent with the request — the local
// Zustand cart is the source of truth during shopping, so this pushes it to
// the server right before quoting/checking out. Modifiers aren't synced —
// the backend cart has no modifier concept yet.
async function syncCartToServer(items: CartItem[], token: string) {
  await ApiService.delete("/cart", token).catch(() => {});
  for (const item of items) {
    const body =
      item.kind === "DISH"
        ? { menuItemId: item.id, quantity: item.quantity }
        : { productId: item.id, quantity: item.quantity };
    await ApiService.post("/cart/items", body, token);
  }
}

export default function CheckoutForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isOrderCreated = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Phone number state – prefilled from user profile, required for checkout
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const profilePhoneRef = useRef<string>(""); // track the phone already saved on the backend

  // Live fee state fetched from backend
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [serviceFee, setServiceFee] = useState<number | null>(null);
  const [vatAmount, setVatAmount] = useState<number | null>(null);
  // Backend-authoritative grand total from the quote. Used as the single source
  // of truth for display — prevents discrepancies from client-side subtotal recomputation.
  const [quoteGrandTotal, setQuoteGrandTotal] = useState<number | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const quoteAbortRef = useRef<AbortController | null>(null);

  // Orders only support WALLET or CARD server-side — CARD (Paystack checkout
  // link) is the only one this UI offers right now.
  const selectedPaymentMethod = "CARD" as const;

  const {
    items: cartItems,
    getTotalPrice,
    addItem,
    decreaseItem,
    removeItem,
    clearCart,
  } = useCartStore();

  const cartTotal = getTotalPrice();

  // Stable fingerprint of cart contents — triggers quote refetch when items,
  // quantities, or modifier selections change (not just array length).
  const cartFingerprint = JSON.stringify(
    cartItems.map(
      (i) => `${i.id}:${i.quantity}:${(i.modifierIds ?? []).join(",")}`,
    ),
  );

  // Fetch live quote from backend whenever address or cart changes
  const fetchQuote = useCallback(
    async (address: typeof selectedAddress) => {
      if (!address || cartItems.length === 0) {
        setDeliveryFee(null);
        setServiceFee(null);
        setVatAmount(null);
        setQuoteGrandTotal(null);
        return;
      }
      const token = session?.accessToken;
      if (!token) return;

      setIsLoadingFee(true);

      try {
        // The backend prices from its own server-side cart, not from a list
        // of items we send — push the local cart there first so the quote
        // reflects what's actually in it.
        await syncCartToServer(cartItems, token);

        const data = await ApiService.post<{
          pricing: {
            deliveryFee: number;
            serviceFee: number;
            vat: number;
            total: number;
          };
        }>("/orders/quote", { deliveryAddressId: address.id }, token);

        setDeliveryFee(data.pricing.deliveryFee ?? null);
        setServiceFee(data.pricing.serviceFee ?? null);
        setVatAmount(data.pricing.vat ?? null);
        setQuoteGrandTotal(data.pricing.total ?? null);
      } catch (err: any) {
        // Display the specific backend error when there is one (e.g. "Store
        // does not deliver to your current city"), otherwise a generic notice.
        toast.error(
          err?.message ||
            "Could not calculate delivery fee. Please double check your address.",
        );
        setDeliveryFee(null);
        setServiceFee(null);
        setVatAmount(null);
        setQuoteGrandTotal(null);
      } finally {
        setIsLoadingFee(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.accessToken, cartItems],
  );

  /** Validates a phone number – accepts E.164 (+XXXXXXXXXXX) or local formats */
  const validatePhone = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "Phone number is required to place an order";
    // Accept E.164 (+countryCode digits) or at least 7 digits (local)
    if (!/^\+?[0-9]{7,15}$/.test(trimmed.replace(/\s+/g, ""))) {
      return "Enter a valid phone number (e.g. +2348012345678)";
    }
    return "";
  };

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      abortControllerRef.current?.abort();
      setIsProcessing(false);
    };
  }, []);

  /** Fetches the user profile to prefill phone number */
  const fetchProfile = useCallback(async () => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") setIsLoadingProfile(false);
      return;
    }
    const token = session?.accessToken;
    if (!token) {
      setIsLoadingProfile(false);
      return;
    }
    try {
      const data = await ApiService.get<{ phone?: string }>("/users/me", token);
      const saved = data.phone || "";
      profilePhoneRef.current = saved;
      setPhone(saved);
    } catch {
      // Non-fatal — user can still enter phone manually
    } finally {
      setIsLoadingProfile(false);
    }
  }, [session?.accessToken, status]);

  const fetchAddresses = useCallback(async () => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") setIsLoadingAddresses(false);
      return;
    }

    const token = session?.accessToken;
    if (!token) {
      setIsLoadingAddresses(false);
      return;
    }

    try {
      setIsLoadingAddresses(true);

      const data = await ApiService.get<any[]>("/addresses", token);
      // Backend uses latitude/longitude; this form's Address type uses lat/lng.
      const mapped: Address[] = data.map((a) => ({
        id: a.id,
        label: a.label,
        street: a.street,
        city: a.city,
        state: a.state,
        isDefault: a.isDefault,
        lat: a.latitude,
        lng: a.longitude,
      }));
      setAddresses(mapped);
      const defaultAddr = mapped.find((a) => a.isDefault) || mapped[0];
      if (defaultAddr) setSelectedAddress(defaultAddr);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load addresses");
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [session?.accessToken, status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAddresses();
      fetchProfile();
    }
    if (status === "unauthenticated") {
      setIsLoadingProfile(false);
    }
  }, [status, fetchAddresses, fetchProfile]);

  // Fetch quote whenever address is selected, cart changes, or token becomes available.
  // `fetchQuote` MUST be in the dep array — it closes over `session?.accessToken`
  // and is re-created by useCallback when the token changes. Without it, the effect
  // can fire with a stale fetchQuote that has no token, silently skipping the call.
  useEffect(() => {
    if (status === "authenticated") {
      fetchQuote(selectedAddress);
    }
  }, [selectedAddress?.id, cartFingerprint, status, fetchQuote]);

  // ✅ FIXED: Detect and handle cancelled/failed order payments on return
  // This runs when user returns from payment cancellation and allows them to retry
  useEffect(() => {
    const handleCancelledOrderRecovery = async () => {
      if (status !== "authenticated" || !mounted) return;

      const orderContext = localStorage.getItem("pending_checkout");
      if (orderContext !== "true") return;

      try {
        const token = session?.accessToken;
        if (!token) return;

        const lastOrderId = localStorage.getItem("last_order_id");
        if (!lastOrderId) {
          localStorage.removeItem("pending_checkout");
          return;
        }

        // Check order status to see if payment was cancelled
        const order = await ApiService.get<{ paymentStatus: string }>(
          `/orders/${lastOrderId}`,
          token,
        );

        // Only show message if order is in pending/cancelled state
        // (i.e., payment was not completed)
        if (
          order.paymentStatus === "CANCELLED" ||
          order.paymentStatus === "FAILED" ||
          order.paymentStatus === "PENDING"
        ) {
          toast.warn(
            "Previous payment was " +
              (order.paymentStatus === "CANCELLED"
                ? "cancelled"
                : "not completed") +
              ". Your cart is ready for a fresh order.",
          );
          // Clear the pending context but preserve cart for immediate retry
          localStorage.removeItem("pending_checkout");
          localStorage.removeItem("last_order_id");
        }
      } catch (err) {
        // Non-fatal error — user can still proceed
        console.warn("Could not recover order context:", err);
        localStorage.removeItem("pending_checkout");
        localStorage.removeItem("last_order_id");
      }
    };

    handleCancelledOrderRecovery();
  }, [status, mounted, session?.accessToken]);

  // No redirect on empty cart — handled in render below

  const handleSaveAddress = async (addressData: Partial<Address>) => {
    const token = session?.accessToken;
    if (!token) return;

    try {
      const created = await ApiService.post<any>(
        "/addresses",
        {
          label: addressData.label,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          latitude: addressData.lat,
          longitude: addressData.lng,
        },
        token,
      );

      await fetchAddresses();
      setSelectedAddress({
        id: created.id,
        label: created.label,
        street: created.street,
        city: created.city,
        state: created.state,
        isDefault: created.isDefault,
        lat: created.latitude,
        lng: created.longitude,
      });
      toast.success("Address added successfully");
      setShowAddAddressModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save address");
    }
  };

  const handlePlaceOrder = async () => {
    if (!isOnline) {
      toast.error("No internet connection.");
      return;
    }
    if (!selectedAddress || !selectedPaymentMethod) {
      toast.error("Please select a delivery address");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Validate phone
    const phoneValidationError = validatePhone(phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      toast.error(phoneValidationError);
      return;
    }

    // Prevent placing an order when the delivery fee hasn't been calculated.
    // Without this guard the user sees ₦0 for delivery and the backend
    // charges the real amount — creating a pricing integrity mismatch.
    if (deliveryFee === null) {
      toast.error(
        "Delivery fee could not be calculated. Please select or change your address and try again.",
      );
      // Re-attempt quote in case it failed silently earlier
      fetchQuote(selectedAddress);
      return;
    }

    const token = session?.accessToken;

    if (!token) {
      toast.error("Please log in to place an order");
      return;
    }

    setIsProcessing(true);

    try {
      // Persist phone to user profile if it was added or changed
      const normalizedPhone = phone.trim();
      if (normalizedPhone !== profilePhoneRef.current) {
        try {
          await ApiService.patch("/users/me/profile", { phone: normalizedPhone }, token);
          profilePhoneRef.current = normalizedPhone;
        } catch (err: any) {
          throw new Error(err?.message || "Failed to save phone number");
        }
      }

      // Re-sync cart (in case it changed since the last quote) then check out
      // in one call — the backend creates the order from its own cart and,
      // for CARD, returns a Paystack authorizationUrl directly. There's no
      // separate payment-initialize step.
      await syncCartToServer(cartItems, token);

      const idempotencyKey = crypto.randomUUID();
      const data = await ApiService.post<{
        orderId: string;
        total?: number;
        pricing?: { total: number };
        authorizationUrl?: string;
      }>(
        "/orders/checkout",
        {
          deliveryAddressId: selectedAddress.id,
          paymentMethod: selectedPaymentMethod,
          idempotencyKey,
        },
        token,
      );

      isOrderCreated.current = true;
      // Cart is cleared after payment is verified (payment callback), not here —
      // clearing early would lose items if the user cancels or payment fails.

      const orderTotal = data.pricing?.total ?? data.total ?? 0;

      if (data.authorizationUrl) {
        localStorage.setItem("pending_checkout", "true");
        localStorage.setItem("last_order_id", data.orderId);
        savePurchaseContext({
          value: orderTotal,
          currency: "NGN",
          contentCategory: "shopping",
          contentId: data.orderId,
        });
        window.location.href = data.authorizationUrl;
      } else {
        // WALLET — already paid, nothing further to redirect to a gateway for.
        clearCart();
        router.push(`/main/orders/confirmed?id=${data.orderId}`);
      }
    } catch (error: any) {
      console.error("Order placement error:", error);
      toast.error(error.message || "Something went wrong.");
    } finally {
      // Always release the processing lock so the button isn't stuck
      // when the user navigates back after a failed/cancelled payment.
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (mounted && cartItems.length === 0 && !isOrderCreated.current) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-4xl mb-4">
          🛒
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Your cart is empty
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
          Add items to your cart before checking out.
        </p>
        <Link
          href="/main/store"
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10"
        >
          Browse Store
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-32 lg:pb-10">
      {!isOnline && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3 text-orange-800">
            <WifiOff className="w-5 h-5" />
            <span className="font-bold">No Internet Connection</span>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Phone Number */}
          <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-yellow-500" /> Contact Number
            </h2>
            {isLoadingProfile ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError)
                      setPhoneError(validatePhone(e.target.value));
                  }}
                  onBlur={() => setPhoneError(validatePhone(phone))}
                  placeholder="+2348012345678"
                  disabled={isProcessing}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm bg-transparent outline-none transition-all
                    ${
                      phoneError
                        ? "border-red-400 dark:border-red-500 focus:border-red-500"
                        : phone && !validatePhone(phone)
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                          : "border-gray-200 dark:border-white/10 focus:border-yellow-500"
                    }
                  `}
                />
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
                {!phone && !phoneError && (
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Required — we use this to contact you about your delivery.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Address trigger */}
          <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <span className="text-yellow-500">📍</span> Delivery Address
            </h2>
            {isLoadingAddresses ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              </div>
            ) : addresses.length === 0 ? (
              /* ── Empty state: no saved addresses ── */
              <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-center">
                <div className="w-14 h-14 rounded-full bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-yellow-500" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    No delivery address yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Add an address to complete your order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors shadow-sm shadow-yellow-500/20 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  Add Delivery Address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setShowAddressPicker(true)}
                  disabled={isProcessing}
                  className={`w-full text-left p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                    selectedAddress
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                      : "border-dashed border-gray-300 dark:border-white/20 hover:border-yellow-500"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full flex-shrink-0 ${
                      selectedAddress
                        ? "bg-yellow-500 text-black"
                        : "bg-gray-100 dark:bg-white/10 text-gray-400"
                    }`}
                  >
                    <span className="text-base">📍</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {selectedAddress ? (
                      <>
                        <p className="font-bold text-sm">
                          {selectedAddress.label || "Home"}
                          {selectedAddress.isDefault && (
                            <span className="ml-2 text-[10px] bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-md font-normal">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {selectedAddress.city
                            ? `${selectedAddress.street}, ${selectedAddress.city}`
                            : selectedAddress.street}
                        </p>
                      </>
                    ) : (
                      <p className="font-bold text-sm text-gray-400">
                        Select a delivery address
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 text-sm font-medium">
                    Change
                  </span>
                </button>

                {/* Add new address shortcut — always visible when saved addresses exist */}
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 transition-colors disabled:opacity-60 pl-1"
                >
                  <Plus className="w-4 h-4" />
                  Use a different address
                </button>
              </div>
            )}
          </section>

          <CartItemsList
            items={cartItems}
            isProcessing={isProcessing}
            onAdd={addItem}
            onDecrease={decreaseItem}
            onRemove={removeItem}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <OrderSummary
              cartTotal={cartTotal}
              deliveryFee={deliveryFee}
              serviceFee={serviceFee}
              vatAmount={vatAmount}
              quoteGrandTotal={quoteGrandTotal}
              isLoadingFee={isLoadingFee}
              isProcessing={isProcessing}
              hasAddress={!!selectedAddress}
              isDisabled={
                isProcessing ||
                !selectedAddress ||
                !isOnline ||
                !!validatePhone(phone)
              }
              onPlaceOrder={handlePlaceOrder}
              retryCount={0}
            />
          </div>
        </div>
      </main>

      <AddressPickerModal
        isOpen={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onSelect={setSelectedAddress}
        onAddNew={() => setShowAddAddressModal(true)}
      />

      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onSave={handleSaveAddress}
      />
    </div>
  );
}
