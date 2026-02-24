"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useSession } from "next-auth/react";
import { WifiOff, Loader2, Phone } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  paymentService,
  InitiatePaymentPayload,
} from "@/services/payment.service";
import { DEFAULT_PAYMENT_METHOD } from "../ride/constants/config";

// Components
import { Address } from "./types";
import { AddAddressModal } from "@/app/main/components/checkout/addadressmodal";
import { CartItemsList } from "@/app/main/components/checkout/cartitemslist";
import { OrderSummary } from "@/app/main/components/checkout/ordersummary";
import { AddressPickerModal } from "@/app/main/components/checkout/address-picker-modal";

// Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const quoteAbortRef = useRef<AbortController | null>(null);

  // Paystack is the only payment method
  const selectedPaymentMethod = DEFAULT_PAYMENT_METHOD;

  const {
    items: cartItems,
    getTotalPrice,
    addItem,
    decreaseItem,
    removeItem,
    clearCart,
  } = useCartStore();

  const cartTotal = getTotalPrice();

  // Fetch live quote from backend whenever address or cart changes
  const fetchQuote = useCallback(
    async (address: typeof selectedAddress) => {
      if (!address || cartItems.length === 0) {
        setDeliveryFee(null);
        setServiceFee(null);
        return;
      }
      const token = session?.accessToken;
      if (!token) return;

      quoteAbortRef.current?.abort();
      quoteAbortRef.current = new AbortController();
      setIsLoadingFee(true);

      try {
        const res = await fetch(`${API_URL}/users/cart/quote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: quoteAbortRef.current.signal,
          body: JSON.stringify({
            addressId: address.id,
            items: cartItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              ...(item.modifierIds && item.modifierIds.length > 0
                ? { modifierIds: item.modifierIds }
                : {}),
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // data.totalDeliveryFee is the route-optimized total
          // data.groups[*].serviceFee summed = total service fee
          const totalServiceFee = (data.groups ?? []).reduce(
            (sum: number, g: any) => sum + (g.serviceFee ?? 0),
            0,
          );
          setDeliveryFee(data.totalDeliveryFee ?? null);
          setServiceFee(totalServiceFee || null);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // Silently fail — user sees fallback text
          setDeliveryFee(null);
          setServiceFee(null);
        }
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
    if (!token) { setIsLoadingProfile(false); return; }
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const saved = data.phone || "";
        profilePhoneRef.current = saved;
        setPhone(saved);
      }
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
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoadingAddresses(true);

      const res = await fetch(`${API_URL}/users/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllerRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
        if (defaultAddr) setSelectedAddress(defaultAddr);
      } else {
        toast.error("Failed to load addresses");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to load addresses");
      }
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

  // Fetch quote whenever address is selected or cart changes
  useEffect(() => {
    if (status === "authenticated") {
      fetchQuote(selectedAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.id, cartItems.length, status]);

  useEffect(() => {
    if (mounted && cartItems.length === 0 && !isOrderCreated.current) {
      router.push("/main/store");
    }
  }, [mounted, cartItems, router]);

  const handleSaveAddress = async (addressData: Partial<Address>) => {
    const token = session?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/users/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add address");

      await fetchAddresses();
      setSelectedAddress(json);
      toast.success("Address added successfully");
      setShowAddAddressModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save address");
    }
  };

  const processPayment = async (
    id: string,
    orderTotal: number,
    isGroup = false,
  ) => {
    try {
      if (!selectedPaymentMethod) return;

      localStorage.setItem("pending_checkout", "true");
      // For groups, we might need to handle differently in "orders/confirmed"
      // But for now, we just save the ID.
      localStorage.setItem("last_order_id", id);

      const paymentPayload: InitiatePaymentPayload = {
        amount: orderTotal,
        email: session?.user?.email || "customer@example.com",
        gateway: selectedPaymentMethod.gateway as any,
        method: selectedPaymentMethod.type as "CARD" | "BANK_TRANSFER" | "CASH",
        type: "ORDER",
        callbackUrl: process.env.NEXT_PUBLIC_APP_URL,
      };

      // FIX: Distinguish between single Order ID and OrderGroup ID
      if (isGroup) {
        paymentPayload.orderGroupId = id;
      } else {
        paymentPayload.orderId = id;
      }

      const token = session?.accessToken;
      if (!token) throw new Error("Authentication missing");

      const paymentRes = await paymentService.initiatePayment(
        paymentPayload,
        token,
      );

      if (paymentRes.authorizationUrl) {
        window.location.href = paymentRes.authorizationUrl;
      } else {
        throw new Error("Payment authorization URL not received");
      }
    } catch (paymentError: any) {
      console.error("Payment initialization error:", paymentError);

      toast.warn(
        "Payment initialization failed. Please check your order history.",
      );
      // If group, maybe redirect to orders list?
      if (isGroup) {
        router.push("/main/orders");
      } else {
        router.push(`/main/orders/confirmed?id=${id}`);
      }
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

    // FIX: Don't force restaurantId if multi-vendor.
    // The backend's createMultiOrder groups items itself.
    // However, if we are hitting 'createOrder' endpoint it might expect one.
    // We'll trust the payload construction handles it.

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
        if (token) {
          const profileRes = await fetch(`${API_URL}/users/profile`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: session?.user?.name || "",
              phone: normalizedPhone,
            }),
          });
          if (profileRes.ok) {
            profilePhoneRef.current = normalizedPhone;
          } else {
            const err = await profileRes.json().catch(() => ({}));
            throw new Error(err?.message || "Failed to save phone number");
          }
        }
      }

      const idempotencyKey = crypto.randomUUID();
      const payload = {
        addressId: selectedAddress.id,
        restaurantId: cartItems[0].restaurantId, // Kept for backward compat with single-order endpoint logic
        items: cartItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          // Forward modifier selections so the backend can price and persist them correctly
          ...(item.modifierIds && item.modifierIds.length > 0
            ? { modifierIds: item.modifierIds }
            : {}),
        })),
      };

      const res = await fetch(`${API_URL}/users/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order creation failed");

      isOrderCreated.current = true;
      clearCart();

      if ((selectedPaymentMethod.type as "CARD" | "BANK_TRANSFER" | "CASH") === "CASH") {
        localStorage.removeItem("pending_checkout");
        localStorage.removeItem("last_order_id");

        await Swal.fire({
          icon: "success",
          title: "Order Placed!",
          text: `Order confirmed.`,
          confirmButtonColor: "#EAB308",
          timer: 2000,
        });

        // Redirect based on whether it was a group or single
        if (data.orderGroupId) {
          router.push("/main/orders");
        } else {
          router.push(`/main/orders/confirmed?id=${data.id}`);
        }
      } else {
        // FIX: Detect if response has orderGroupId
        if (data.orderGroupId) {
          // It's a multi-order
          await processPayment(
            data.orderGroupId,
            data.grandTotal || data.total,
            true,
          );
        } else {
          // Single order
          await processPayment(data.id, data.total, false);
        }
      }
    } catch (error: any) {
      console.error("Order placement error:", error);
      toast.error(error.message || "Something went wrong.");
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
                    if (phoneError) setPhoneError(validatePhone(e.target.value));
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
            ) : (
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
              isLoadingFee={isLoadingFee}
              isProcessing={isProcessing}
              isDisabled={isProcessing || !selectedAddress || !isOnline || !!validatePhone(phone)}
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
