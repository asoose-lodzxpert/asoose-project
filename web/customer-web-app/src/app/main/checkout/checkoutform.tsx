"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore, CartItem } from "@/store/useCartStore";
import { useSession } from "next-auth/react";
import {
  WifiOff,
  Loader2,
  Phone,
  MapPin,
  Plus,
  CreditCard,
  Wallet,
  NotebookPen,
} from "lucide-react";
import { toast } from "react-toastify";
import { ApiService } from "@/services/api.service";
import { savePurchaseContext } from "@/lib/meta-pixel";
import { WalletService } from "@/services/wallet.service";
import { CartService, mapServerCartItems } from "@/services/cart.service";
import {
  AddressService,
  type AddressLabel,
} from "@/services/address.service";

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
  await CartService.clear(token).catch(() => {});
  for (const item of items) {
    const body =
      item.kind === "DISH"
        ? { menuItemId: item.id, quantity: item.quantity }
        : { productId: item.id, quantity: item.quantity };
    await CartService.add(body, token);
  }
}

export default function CheckoutForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isOrderCreated = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "WALLET">(
    "CARD",
  );
  const [deliveryNote, setDeliveryNote] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("20000");
  const [topupLoading, setTopupLoading] = useState(false);

  // Phone number state – prefilled from user profile, required for checkout
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Live fee state fetched from backend
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [serviceFee, setServiceFee] = useState<number | null>(null);
  const [vatAmount, setVatAmount] = useState<number | null>(null);
  // Backend-authoritative grand total from the quote. Used as the single source
  // of truth for display — prevents discrepancies from client-side subtotal recomputation.
  const [quoteGrandTotal, setQuoteGrandTotal] = useState<number | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);

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

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [
    cartFingerprint,
    selectedAddress?.id,
    paymentMethod,
    deliveryNote,
    phone,
  ]);

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

  const normalizePhone = (value: string) => {
    const cleaned = value.replace(/[\s-]/g, "");
    if (cleaned.startsWith("+234")) return cleaned;
    if (cleaned.startsWith("234")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+234${cleaned.slice(1)}`;
    return cleaned;
  };

  const fetchWalletBalance = useCallback(async () => {
    const token = session?.accessToken;
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
  }, [session?.accessToken]);

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

      const data = await AddressService.list(token);
      // Backend uses latitude/longitude; this form's Address type uses lat/lng.
      const mapped: Address[] = data.map((a) => ({
        id: a.id,
        label: a.label,
        street: a.street || "",
        city: a.city || undefined,
        state: a.state || undefined,
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
      fetchWalletBalance();
    }
    if (status === "unauthenticated") {
      setIsLoadingProfile(false);
    }
  }, [status, fetchAddresses, fetchProfile, fetchWalletBalance]);

  // Fetch quote whenever address is selected, cart changes, or token becomes available.
  // `fetchQuote` MUST be in the dep array — it closes over `session?.accessToken`
  // and is re-created by useCallback when the token changes. Without it, the effect
  // can fire with a stale fetchQuote that has no token, silently skipping the call.
  useEffect(() => {
    if (status === "authenticated") {
      fetchQuote(selectedAddress);
    }
  }, [selectedAddress, cartFingerprint, status, fetchQuote]);

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
      if (addressData.lat == null || addressData.lng == null) {
        throw new Error("Please pin the address location before saving.");
      }

      const created = await AddressService.create(
        {
          label: (addressData.label || "HOME").toUpperCase() as AddressLabel,
          latitude: addressData.lat,
          longitude: addressData.lng,
          ...(addressData.street ? { street: addressData.street } : {}),
          ...(addressData.city ? { city: addressData.city } : {}),
          ...(addressData.state ? { state: addressData.state } : {}),
        },
        token,
      );

      await fetchAddresses();
      setSelectedAddress({
        id: created.id,
        label: created.label,
        street: created.street || "",
        city: created.city || undefined,
        state: created.state || undefined,
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

  const handleRemoveCartItem = async (lineId: string) => {
    const item = cartItems.find((entry) => (entry.lineId ?? entry.id) === lineId);
    removeItem(lineId);

    const token = session?.accessToken;
    if (!token || !item) return;

    try {
      // Re-read the server cart because quote calculation can rebuild it and
      // therefore change backend cart-item IDs.
      const serverCart = await CartService.get(token);
      const serverItem = serverCart.items.find((entry) =>
        item.kind === "DISH"
          ? entry.menuItemId === item.id
          : entry.productId === item.id,
      );
      if (serverItem) await CartService.removeItem(serverItem.id, token);
    } catch (error: any) {
      toast.error(error?.message || "The item could not be removed from your cart.");
      try {
        const currentCart = await CartService.get(token);
        useCartStore
          .getState()
          .replaceItems(mapServerCartItems(currentCart));
      } catch {
        // The optimistic local removal remains when refresh is unavailable.
      }
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Remove every item from your cart?")) return;

    const previousItems = cartItems;
    clearCart();
    const token = session?.accessToken;
    if (!token) return;

    try {
      await CartService.clear(token);
      toast.success("Cart cleared");
    } catch (error: any) {
      useCartStore.getState().replaceItems(previousItems);
      toast.error(error?.message || "The cart could not be cleared.");
    }
  };

  const handleWalletTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Enter a valid top-up amount.");
      return;
    }

    const token = session?.accessToken;
    if (!token) {
      toast.error("Please log in to top up your wallet.");
      return;
    }

    setTopupLoading(true);
    try {
      const result = await WalletService.initializeTopup(amount, token);
      if (!result.authorizationUrl?.startsWith("https://checkout.paystack.com/")) {
        throw new Error("The payment link returned by the server is invalid.");
      }

      localStorage.setItem(
        "pending_wallet_topup",
        JSON.stringify({
          reference: result.reference,
          returnTo: "/main/checkout",
        }),
      );
      window.location.href = result.authorizationUrl;
    } catch (error: any) {
      toast.error(error?.message || "Could not initialize wallet top-up.");
      setTopupLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isOnline) {
      toast.error("No internet connection.");
      return;
    }
    if (!selectedAddress) {
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

    if (
      paymentMethod === "WALLET" &&
      (walletBalance === null || walletBalance < (quoteGrandTotal ?? 0))
    ) {
      toast.error("Your wallet balance is not enough for this order.");
      setShowTopup(true);
      return;
    }

    const token = session?.accessToken;

    if (!token) {
      toast.error("Please log in to place an order");
      return;
    }

    setIsProcessing(true);

    try {
      // Re-sync cart (in case it changed since the last quote) then check out
      // in one call — the backend creates the order from its own cart and,
      // for CARD, returns a Paystack authorizationUrl directly. There's no
      // separate payment-initialize step.
      await syncCartToServer(cartItems, token);

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `chk-${session?.user.id ?? "customer"}-${Date.now()}`;
      }
      const data = await ApiService.post<{
        orderId: string;
        total?: number;
        pricing?: { total: number };
        authorizationUrl?: string;
      }>(
        "/orders/checkout",
        {
          deliveryAddressId: selectedAddress.id,
          paymentMethod,
          deliveryNote: deliveryNote.trim() || undefined,
          alternatePhone: normalizePhone(phone),
          idempotencyKey: idempotencyKeyRef.current,
        },
        token,
      );

      isOrderCreated.current = true;
      // Cart is cleared after payment is verified (payment callback), not here —
      // clearing early would lose items if the user cancels or payment fails.

      const orderTotal = data.pricing?.total ?? data.total ?? 0;

      if (data.authorizationUrl) {
        if (!data.authorizationUrl.startsWith("https://checkout.paystack.com/")) {
          throw new Error("The payment link returned by the server is invalid.");
        }
        localStorage.setItem("pending_checkout", "true");
        localStorage.setItem("last_order_id", data.orderId);
        savePurchaseContext({
          value: orderTotal,
          currency: "NGN",
          contentCategory: "shopping",
          contentId: data.orderId,
        });
        window.location.href = data.authorizationUrl;
      } else if (paymentMethod === "WALLET") {
        // WALLET — already paid, nothing further to redirect to a gateway for.
        clearCart();
        router.push(`/main/orders/confirmed?id=${data.orderId}`);
      } else {
        throw new Error("The online payment link was not returned.");
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
          {/* Alternate contact number */}
          <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-yellow-500" /> Alternate Phone
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
                    Required — used if we cannot reach your primary number.
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
                          {[selectedAddress.street, selectedAddress.city]
                            .filter(Boolean)
                            .join(", ") ||
                            `${selectedAddress.lat.toFixed(5)}, ${selectedAddress.lng.toFixed(5)}`}
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

          <section className="space-y-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#151515]">
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <CreditCard className="h-5 w-5 text-yellow-500" /> Payment
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={paymentMethod === "CARD"}
                  onClick={() => setPaymentMethod("CARD")}
                  disabled={isProcessing}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${paymentMethod === "CARD" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10" : "border-gray-200 dark:border-white/10"}`}
                >
                  <span className="rounded-xl bg-yellow-100 p-2 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black">Pay online</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      Secure Paystack checkout
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={paymentMethod === "WALLET"}
                  onClick={() => {
                    setPaymentMethod("WALLET");
                    if (
                      walletBalance !== null &&
                      walletBalance < (quoteGrandTotal ?? 0)
                    ) {
                      setShowTopup(true);
                    }
                  }}
                  disabled={isProcessing}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${paymentMethod === "WALLET" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10" : "border-gray-200 dark:border-white/10"}`}
                >
                  <span className="rounded-xl bg-yellow-100 p-2 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black">Wallet</span>
                    <span
                      className={`mt-0.5 block text-xs ${walletBalance !== null && walletBalance < (quoteGrandTotal ?? 0) ? "text-red-500" : "text-gray-500"}`}
                    >
                      {walletLoading
                        ? "Checking balance…"
                        : walletBalance === null
                          ? "Balance unavailable"
                          : `Balance: ₦${walletBalance.toLocaleString()}`}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {paymentMethod === "WALLET" && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Top up your wallet</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Add funds with Paystack and return to this checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTopup((current) => !current)}
                    className="shrink-0 rounded-xl bg-yellow-100 px-3 py-2 text-xs font-black text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                  >
                    {showTopup ? "Close" : "Top up"}
                  </button>
                </div>

                {showTopup && (
                  <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-white/10">
                    <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-yellow-500 dark:border-white/10 dark:bg-[#151515]">
                      <span className="font-bold text-gray-500">₦</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={topupAmount}
                        onChange={(event) => setTopupAmount(event.target.value)}
                        aria-label="Wallet top-up amount"
                        className="min-w-0 flex-1 bg-transparent px-2 py-3 font-black outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[5000, 10000, 20000].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setTopupAmount(String(amount))}
                          className={`rounded-xl border px-2 py-2 text-xs font-bold ${topupAmount === String(amount) ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-gray-200 text-gray-500 dark:border-white/10"}`}
                        >
                          ₦{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleWalletTopup}
                      disabled={topupLoading || !topupAmount}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                      {topupLoading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {topupLoading
                        ? "Opening Paystack…"
                        : "Continue to Paystack"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <label className="block border-t border-gray-100 pt-5 dark:border-white/5">
              <span className="mb-2 flex items-center gap-2 text-sm font-black">
                <NotebookPen className="h-4 w-4 text-yellow-500" /> Delivery note
                <span className="font-medium text-gray-400">(optional)</span>
              </span>
              <textarea
                value={deliveryNote}
                onChange={(event) => setDeliveryNote(event.target.value)}
                maxLength={500}
                disabled={isProcessing}
                placeholder="e.g. Leave at the gate"
                className="h-24 w-full resize-none rounded-2xl border border-gray-200 bg-transparent p-4 text-sm outline-none transition focus:border-yellow-500 dark:border-white/10"
              />
              <span className="mt-1 block text-right text-[10px] text-gray-400">
                {deliveryNote.length}/500
              </span>
            </label>
          </section>

          <CartItemsList
            items={cartItems}
            isProcessing={isProcessing}
            onAdd={addItem}
            onDecrease={decreaseItem}
            onRemove={handleRemoveCartItem}
            onClear={handleClearCart}
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
                !!validatePhone(phone) ||
                (paymentMethod === "WALLET" &&
                  (walletLoading ||
                    walletBalance === null ||
                    walletBalance < (quoteGrandTotal ?? 0)))
              }
              onPlaceOrder={handlePlaceOrder}
              retryCount={0}
              paymentMethod={paymentMethod}
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
