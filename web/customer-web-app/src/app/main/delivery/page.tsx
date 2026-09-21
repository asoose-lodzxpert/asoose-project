"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  MapPinned,
  Package,
  Loader2,
} from "lucide-react";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { LocationInput } from "@/components/shared/LocationInput";
import { DeliveryMapPicker } from "./components/DeliveryMapPicker";
import {
  DeliveryService,
  type ParcelParty,
  type ParcelPaymentMethod,
  type ParcelSize,
} from "@/services/delivery.service";
import { AddressService, type SavedAddress } from "@/services/address.service";
import { WalletService } from "@/services/wallet.service";
import { ApiService } from "@/services/api.service";
import { useParcelQuote } from "@/hooks/useParcelQuote";
import {
  formatNaira,
  formatParcelDate,
  parcelContactsPayload,
  scheduledTimestamp,
  validateParcelContacts,
  redirectToParcelPayment,
} from "@/lib/parcel-booking";

const sizes: { value: ParcelSize; title: string; description: string }[] = [
  {
    value: "SMALL",
    title: "Small",
    description: "Documents & small items",
  },
  {
    value: "MEDIUM",
    title: "Medium",
    description: "Boxes & bags",
  },
  {
    value: "LARGE",
    title: "Large",
    description: "Furniture & bulk",
  },
];
const parties: { value: ParcelParty; title: string; description: string }[] = [
  {
    value: "SENDER",
    title: "Send a package",
    description: "From you to someone else",
  },
  {
    value: "RECIPIENT",
    title: "Bring a package to me",
    description: "Pick up from someone and deliver to you",
  },
  {
    value: "THIRD_PARTY",
    title: "Book for someone else",
    description: "Arrange pickup and delivery for others",
  },
];
const inputClass =
  "mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:border-zinc-700 dark:bg-zinc-800";
const cardClass =
  "rounded-2xl border border-black/5 bg-white p-4 sm:rounded-3xl sm:p-7 dark:border-white/10 dark:bg-[#151515]";
const choiceClass = (selected: boolean) =>
  `rounded-2xl border p-4 text-left transition focus-visible:outline-yellow-500 ${selected ? "border-yellow-500 bg-yellow-400/10 ring-1 ring-yellow-500" : "border-zinc-200 hover:border-yellow-400 dark:border-zinc-700"}`;

function savedAddressText(address: SavedAddress) {
  return [address.apartment, address.street, address.city, address.state]
    .filter(Boolean)
    .join(", ");
}

function savedAddressOption(address: SavedAddress) {
  const location = savedAddressText(address) || address.label;
  const label = String(address.label || "Saved")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
  return `${label}${address.isDefault ? " (Default)" : ""} — ${location}`;
}

export default function DeliveryPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const router = useRouter();
  const store = useDeliveryStore();
  const {
    packageInfo: fields,
    pickupPos,
    dropoffPos,
    bookingStep: step,
    party,
    paymentMethod,
    scheduleLater,
    scheduledLocal,
    submission,
  } = store;
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressError, setAddressError] = useState("");
  const [addressAttempt, setAddressAttempt] = useState(0);
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null>(null);
  const [profileError, setProfileError] = useState("");
  const [wallet, setWallet] = useState<number | null>(null);
  const [walletError, setWalletError] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [topup, setTopup] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingError, setBookingError] = useState("");
  const [sending, setSending] = useState(false);
  const [mapKind, setMapKind] = useState<"pickup" | "dropoff" | null>(null);
  const busy = useRef(false);
  const leaving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pickup = pickupPos
    ? {
        latitude: pickupPos.lat,
        longitude: pickupPos.lng,
        address: fields.pickupAddress,
      }
    : null;
  const dropoff = dropoffPos
    ? {
        latitude: dropoffPos.lat,
        longitude: dropoffPos.lng,
        address: fields.destinationAddress,
      }
    : null;
  const {
    quote,
    error: quoteError,
    loading: quoteLoading,
    retry: retryQuote,
  } = useParcelQuote(pickup, dropoff, fields.size, token);
  const meaningful = Boolean(
    fields.pickupAddress ||
    fields.destinationAddress ||
    fields.instructions ||
    fields.senderName ||
    fields.recipientName ||
    fields.senderPhone ||
    fields.recipientPhone ||
    scheduleLater,
  );
  const locked = Boolean(submission) || sending;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/sign-in");
  }, [status, router]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    setAddressError("");
    setProfileError("");
    AddressService.list(token)
      .then((items) => {
        if (active) setAddresses(items);
      })
      .catch(() => {
        if (active)
          setAddressError(
            "Saved addresses couldn’t load. Search or use the map, or retry.",
          );
      });
    ApiService.get<{
      firstName: string;
      lastName: string;
      phone: string | null;
    }>("/users/me", token)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active)
          setProfileError("Your contact details couldn’t load. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [token, addressAttempt]);
  const refreshWallet = useCallback(async () => {
    if (!token) return;
    setWalletLoading(true);
    setWalletError("");
    try {
      const result = await WalletService.getMyWallet(token);
      setWallet(result.balance);
    } catch {
      setWallet(null);
      setWalletError("Couldn’t load your wallet balance. Please retry.");
    } finally {
      setWalletLoading(false);
    }
  }, [token]);
  useEffect(() => {
    if (step === 2) void refreshWallet();
  }, [step, refreshWallet]);
  useEffect(() => {
    if (!meaningful) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (!leaving.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (!link || leaving.current || event.defaultPrevented) return;
      if (
        !window.confirm(
          "Leave this booking? Your draft will be saved so you can return to it.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const back = () => {
      if (
        !leaving.current &&
        !window.confirm("Leave this booking? Your draft is saved.")
      )
        window.history.forward();
    };
    window.addEventListener("popstate", back);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("popstate", back);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [meaningful]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function go(next: number) {
    useDeliveryStore.setState({ bookingStep: next });
    setErrors({});
  }
  function selectLocation(
    kind: "pickup" | "dropoff",
    position: { lat: number; lng: number } | null,
    address: string,
  ) {
    useDeliveryStore.setState(
      kind === "pickup"
        ? { pickupPos: position, pickupAddressId: null }
        : { dropoffPos: position, dropoffAddressId: null },
    );
    store.setPackageInfo(
      kind === "pickup"
        ? { pickupAddress: address }
        : { destinationAddress: address },
    );
    store.setCalculatedFee(null);
  }
  function validateContacts() {
    const next = validateParcelContacts(party, fields);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first)
      requestAnimationFrame(() => document.getElementById(first)?.focus());
    return !first;
  }
  async function topUp() {
    const amount = Number(topup);
    if (!token || topupBusy) return;
    if (!Number.isInteger(amount) || amount <= 0) {
      setErrors({ topup: "Enter a positive whole amount in Naira." });
      return;
    }
    setTopupBusy(true);
    setErrors({});
    try {
      const result = await WalletService.initializeTopup(amount, token);
      localStorage.setItem(
        "pending_wallet_topup",
        JSON.stringify({
          reference: result.reference,
          returnTo: "/main/delivery",
        }),
      );
      leaving.current = true;
      window.location.assign(result.authorizationUrl);
    } catch (cause) {
      leaving.current = false;
      setErrors({
        topup:
          (cause as Error).message || "Couldn’t start top-up. Please retry.",
      });
    } finally {
      setTopupBusy(false);
    }
  }
  async function book() {
    if (busy.current || !token || !quote || !pickup || !dropoff) return;
    if (!submission && !validateContacts()) {
      useDeliveryStore.setState({ bookingStep: 1 });
      return;
    }
    let scheduledAt: string | undefined;
    try {
      scheduledAt =
        submission?.scheduledAt ??
        scheduledTimestamp(scheduleLater, scheduledLocal);
    } catch (cause) {
      setErrors({ scheduledLocal: (cause as Error).message });
      document.getElementById("scheduledLocal")?.focus();
      return;
    }
    if (
      paymentMethod === "WALLET" &&
      (wallet === null || wallet < quote.fare || walletLoading)
    )
      return;
    if (party !== "THIRD_PARTY" && (!profile || !profile.phone?.trim())) {
      setBookingError(
        "Add your phone number to your profile before booking as sender or recipient.",
      );
      return;
    }
    busy.current = true;
    setSending(true);
    setBookingError("");
    const payload = submission || {
      pickup,
      dropoff,
      size: fields.size,
      ...parcelContactsPayload(party, fields),
      paymentMethod,
      ...(scheduledAt ? { scheduledAt } : {}),
      idempotencyKey: `parcel-${crypto.randomUUID()}`,
    };
    useDeliveryStore.setState({ submission: payload });
    try {
      const result = await DeliveryService.createDelivery(payload, token);
      // Creation has succeeded even when card payment is still outstanding.
      const id = result.delivery.id;
      if (result.confirmationCode) {
        sessionStorage.setItem(`parcel-confirmation:${session?.user?.id || ""}:${id}`, result.confirmationCode);
      }
      store.resetDelivery();
      leaving.current = true;
      if (result.authorizationUrl && payload.paymentMethod === "CARD") {
        try {
          redirectToParcelPayment(
            id,
            result.authorizationUrl,
            result.reference,
          );
        } catch {
          router.push(`/main/delivery/${id}`);
        }
      } else router.push(`/main/delivery/${id}`);
    } catch (cause) {
      setBookingError(
        (cause as Error).message ||
          "Couldn’t confirm this booking. Retry the same booking safely.",
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  function discard() {
    if (
      window.confirm(
        submission
          ? "This request may already have reached the server. Check your parcel history before starting another booking. Discard this draft?"
          : "Discard this delivery draft?",
      )
    ) {
      store.resetDelivery();
      setErrors({});
      setBookingError("");
    }
  }

  if (status !== "authenticated")
    return (
      <div role="status" className="p-12 text-center">
        Loading your booking…
      </div>
    );
  const insufficient =
    paymentMethod === "WALLET" &&
    wallet !== null &&
    quote &&
    wallet < quote.fare;
  const ownName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "Loading your profile…";
  const ownPhone = profile?.phone || "Phone number not set";
  const paymentLabel =
    paymentMethod === "WALLET" ? "Wallet" : "Pay on web";
  const summary = [
    ["Pickup", fields.pickupAddress, 0],
    ["Drop-off", fields.destinationAddress, 0],
    [
      "Route",
      quote
        ? `${quote.distanceKm.toFixed(1)} km · about ${Math.ceil(quote.estimatedDurationMinutes)} min`
        : "Quote unavailable",
      0,
    ],
    ["Parcel size", fields.size, 0],
    ["Description / instructions", fields.instructions || "Not provided", 1],
    [
      "Sender",
      party === "SENDER"
        ? `${ownName} · ${ownPhone}`
        : `${fields.senderName} · ${fields.senderPhone}`,
      1,
    ],
    [
      "Recipient",
      party === "RECIPIENT"
        ? `${ownName} · ${ownPhone}`
        : `${fields.recipientName} · ${fields.recipientPhone}`,
      1,
    ],
    [
      "When",
      scheduleLater
        ? scheduledLocal && Number.isFinite(new Date(scheduledLocal).getTime())
          ? formatParcelDate(scheduledLocal)
          : "Choose a time"
        : "Send now",
      2,
    ],
    ["Payment", paymentLabel, 2],
  ] as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f7f5] pb-28 text-zinc-900 dark:bg-[#0a0a0a] dark:text-white">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-10">
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:mt-2 sm:text-3xl">
              Send Parcel
            </h1>
            <p className="mt-1 text-xs text-zinc-500 sm:mt-2 sm:text-sm">
              Book now or schedule a pickup for later.
            </p>
          </div>
          <Link
            href="/main/profile?tab=deliveries"
            className="shrink-0 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-[11px] font-bold shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:px-3 sm:text-xs"
          >
            My parcels
          </Link>
        </header>
        <nav
          aria-label="Booking progress"
          className="mb-4 grid grid-cols-3 gap-1.5 sm:mb-6 sm:gap-2"
        >
          {["Locations", "Contact", "Review"].map(
            (label, index) => (
              <button
                key={label}
                disabled={index > step || locked}
                onClick={() => go(index)}
                aria-current={step === index ? "step" : undefined}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] font-bold sm:flex-row sm:gap-2 sm:p-3 sm:text-left sm:text-sm ${index === step ? "bg-[#181816] text-white dark:bg-yellow-400 dark:text-black" : "bg-white text-zinc-500 dark:bg-white/5"}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] sm:h-6 sm:w-6 sm:text-xs">
                  {index < step ? <Check size={14} /> : index + 1}
                </span>
                {label}
              </button>
            ),
          )}
        </nav>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className={cardClass}>
            <h2
              ref={heading}
              tabIndex={-1}
              className="mb-4 text-lg font-bold outline-none sm:mb-5 sm:text-xl"
            >
              {
                [
                  "Where is your package going?",
                  "How can we help?",
                  "Review and book your parcel",
                ][step]
              }
            </h2>
            <fieldset
              disabled={locked}
              className="min-w-0 space-y-5 disabled:opacity-75"
            >
              {step === 0 && (
                <>
                  {(["pickup", "dropoff"] as const).map((kind) => (
                    <div
                      key={kind}
                      role="group"
                      aria-label={`${kind} location`}
                    >
                      <p className="mb-2 text-sm font-bold">
                        {kind === "pickup"
                          ? "Pickup location"
                          : "Drop-off location"}
                      </p>
                      <LocationInput
                        value={
                          kind === "pickup"
                            ? fields.pickupAddress
                            : fields.destinationAddress
                        }
                        placeholder={
                          kind === "pickup"
                            ? "Search pickup address"
                            : "Search drop-off address"
                        }
                        showGeolocation={kind === "pickup"}
                        onValueChange={(value) =>
                          selectLocation(kind, null, value)
                        }
                        onLocationSelect={(position, address) =>
                          selectLocation(kind, position, address)
                        }
                      />
                      <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => setMapKind(kind)}
                          className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-yellow-400/5 sm:justify-start"
                        >
                          <MapPin size={14} />
                          Choose on map
                        </button>
                        {addresses.length > 0 && (
                          <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
                            <MapPinned
                              aria-hidden="true"
                              size={15}
                              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-yellow-600"
                            />
                            <select
                              aria-label={`Saved ${kind} address`}
                              value=""
                              onChange={(event) => {
                                const address = addresses.find(
                                  (item) => item.id === event.target.value,
                                );
                                if (address)
                                  selectLocation(
                                    kind,
                                    {
                                      lat: address.latitude,
                                      lng: address.longitude,
                                    },
                                    savedAddressText(address),
                                  );
                              }}
                              className="min-h-10 w-full appearance-none truncate rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-9 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition hover:border-yellow-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-400/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                            >
                              <option value="">Use a saved address</option>
                              {addresses.map((address) => (
                                <option key={address.id} value={address.id}>
                                  {savedAddressOption(address)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              aria-hidden="true"
                              size={15}
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                            />
                          </div>
                        )}
                      </div>
                      {(kind === "pickup"
                        ? fields.pickupAddress && !pickupPos
                        : fields.destinationAddress && !dropoffPos) && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                          Select a search result or map point to confirm the
                          coordinates.
                        </p>
                      )}
                    </div>
                  ))}
                  {addressError && (
                    <p role="alert" className="text-sm text-red-600">
                      {addressError}{" "}
                      <button
                        onClick={() => setAddressAttempt(addressAttempt + 1)}
                        className="underline"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  <fieldset>
                    <legend className="mb-3 text-sm font-bold">
                      Parcel size
                    </legend>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {sizes.map((size) => (
                        <button
                          type="button"
                          key={size.value}
                          aria-pressed={fields.size === size.value}
                          onClick={() =>
                            store.setPackageInfo({ size: size.value })
                          }
                          className={`min-w-0 rounded-xl border px-1.5 py-3 text-center transition focus-visible:outline-yellow-500 sm:rounded-2xl sm:p-4 sm:text-left ${fields.size === size.value ? "border-yellow-500 bg-yellow-400/10 ring-1 ring-yellow-500" : "border-zinc-200 hover:border-yellow-400 dark:border-zinc-700"}`}
                        >
                          <Package className="mx-auto mb-2 h-5 w-5 text-yellow-600 sm:mx-0 sm:mb-3" />
                          <span className="block truncate text-xs font-bold sm:text-sm">
                            {size.title}
                          </span>
                          <span className="mt-1 block text-[10px] leading-4 text-zinc-500 sm:text-xs sm:leading-5">
                            {size.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="grid gap-2">
                    {parties.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={party === item.value}
                        onClick={() => {
                          useDeliveryStore.setState({ party: item.value });
                          setErrors({});
                        }}
                        className={choiceClass(party === item.value)}
                      >
                        <span className="block text-sm font-bold">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          {item.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  {party !== "THIRD_PARTY" && (
                    <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-white/5">
                      <p className="font-bold">
                        {party === "SENDER" ? "Sender" : "Recipient"} · You
                      </p>
                      <p className="mt-1">{ownName}</p>
                      <p className="text-zinc-500">{ownPhone}</p>
                      {profileError && (
                        <p role="alert">
                          {profileError}{" "}
                          <button
                            onClick={() =>
                              setAddressAttempt(addressAttempt + 1)
                            }
                            className="underline"
                          >
                            Retry
                          </button>
                        </p>
                      )}
                      {profile && !profile.phone?.trim() && (
                        <Link
                          className="mt-2 inline-block font-semibold underline"
                          href="/main/profile"
                        >
                          Add phone number to profile
                        </Link>
                      )}
                    </div>
                  )}
                  {(["sender", "recipient"] as const)
                    .filter(
                      (contact) =>
                        party === "THIRD_PARTY" ||
                        contact ===
                          (party === "SENDER" ? "recipient" : "sender"),
                    )
                    .map((contact) => (
                      <div key={contact} className="grid gap-4 sm:grid-cols-2">
                        {(["Name", "Phone"] as const).map((suffix) => {
                          const name = `${contact}${suffix}` as
                            | "senderName"
                            | "senderPhone"
                            | "recipientName"
                            | "recipientPhone";
                          return (
                            <div key={name}>
                              <label
                                htmlFor={name}
                                className="text-sm font-semibold capitalize"
                              >
                                {contact} {suffix.toLowerCase()}
                              </label>
                              <input
                                id={name}
                                value={fields[name]}
                                onChange={(e) =>
                                  store.setPackageInfo({
                                    [name]: e.target.value,
                                  })
                                }
                                type={suffix === "Phone" ? "tel" : "text"}
                                inputMode={
                                  suffix === "Phone" ? "tel" : undefined
                                }
                                maxLength={suffix === "Phone" ? 16 : 100}
                                autoComplete="off"
                                aria-invalid={Boolean(errors[name])}
                                aria-describedby={
                                  errors[name] ? `${name}-error` : undefined
                                }
                                className={inputClass}
                              />
                              {errors[name] && (
                                <p
                                  id={`${name}-error`}
                                  className="mt-1 text-xs text-red-600"
                                >
                                  {errors[name]}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  <div>
                    <label
                      htmlFor="instructions"
                      className="text-sm font-semibold"
                    >
                      Parcel description & delivery instructions{" "}
                      <span className="font-normal text-zinc-500">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="instructions"
                      value={fields.instructions}
                      onChange={(e) =>
                        store.setPackageInfo({ instructions: e.target.value })
                      }
                      maxLength={500}
                      rows={4}
                      placeholder="What are you sending? Include collection or handling instructions."
                      aria-invalid={Boolean(errors.instructions)}
                      aria-describedby="description-hint"
                      className={inputClass}
                    />
                    <p
                      id="description-hint"
                      className="mt-1 text-xs text-zinc-500"
                    >
                      {errors.instructions ||
                        `${fields.instructions.length}/500 characters · at least 3 if supplied`}
                    </p>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <fieldset>
                    <legend className="mb-3 text-sm font-bold">
                      Delivery time
                    </legend>
                    <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                      {[false, true].map((later) => (
                        <button
                          type="button"
                          key={String(later)}
                          aria-pressed={scheduleLater === later}
                          className={choiceClass(scheduleLater === later)}
                          onClick={() => {
                            useDeliveryStore.setState({ scheduleLater: later });
                            setErrors({});
                          }}
                        >
                          {later ? "Schedule for later" : "Send now"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  {scheduleLater && (
                    <div>
                      <label
                        htmlFor="scheduledLocal"
                        className="text-sm font-semibold"
                      >
                        Pickup date and time
                      </label>
                      <input
                        id="scheduledLocal"
                        type="datetime-local"
                        value={scheduledLocal}
                        min={new Date(
                          Date.now() -
                            new Date().getTimezoneOffset() * 60000 +
                            60000,
                        )
                          .toISOString()
                          .slice(0, 16)}
                        onChange={(e) =>
                          useDeliveryStore.setState({
                            scheduledLocal: e.target.value,
                          })
                        }
                        aria-invalid={Boolean(errors.scheduledLocal)}
                        aria-describedby="schedule-hint schedule-error"
                        className={inputClass}
                      />
                      <p
                        id="schedule-hint"
                        className="mt-2 text-xs leading-5 text-zinc-500"
                      >
                        Shown in your local timezone (
                        {Intl.DateTimeFormat().resolvedOptions().timeZone}).
                        This is when Asoose starts looking for a rider, not a
                        guaranteed arrival time.
                      </p>
                      {errors.scheduledLocal && (
                        <p
                          id="schedule-error"
                          role="alert"
                          className="mt-1 text-xs text-red-600"
                        >
                          {errors.scheduledLocal}
                        </p>
                      )}
                    </div>
                  )}
                  <fieldset>
                    <legend className="mb-3 text-sm font-bold">
                      Payment method
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(["WALLET", "CARD"] as ParcelPaymentMethod[]).map(
                        (method) => (
                          <button
                            type="button"
                            key={method}
                            aria-pressed={paymentMethod === method}
                            onClick={() =>
                              useDeliveryStore.setState({
                                paymentMethod: method,
                              })
                            }
                            className={choiceClass(paymentMethod === method)}
                          >
                            {method === "WALLET" ? "Wallet" : "Pay on web"}
                          </button>
                        ),
                      )}
                    </div>
                  </fieldset>
                  {paymentMethod === "CARD" && (
                    <p className="text-sm text-zinc-500">
                      Pay securely with Paystack. Your parcel stays payment
                      pending until payment is confirmed.
                    </p>
                  )}
                </>
              )}
            </fieldset>
            {step === 2 && paymentMethod === "WALLET" && (
              <div className="mt-5 rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
                <p className="text-sm font-semibold">
                  Wallet balance:{" "}
                  {walletLoading
                    ? "Loading…"
                    : wallet === null
                      ? "Unavailable"
                      : formatNaira(wallet)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Your wallet is charged when you book, including scheduled
                  deliveries.
                </p>
                {walletError && (
                  <p role="alert" className="mt-2 text-sm text-red-600">
                    {walletError}
                  </p>
                )}
                <button
                  disabled={walletLoading}
                  onClick={refreshWallet}
                  className="mt-2 text-xs font-bold underline"
                >
                  Refresh balance
                </button>
                {insufficient && (
                  <p role="alert" className="mt-2 text-sm text-red-600">
                    Insufficient balance. Top up at least{" "}
                    {formatNaira(quote!.fare - wallet!)} to book.
                  </p>
                )}
                <div className="mt-3 grid items-end gap-2 sm:flex sm:flex-wrap">
                  <label
                    className="min-w-0 flex-1 text-xs font-semibold"
                    htmlFor="topup"
                  >
                    Top-up amount (₦)
                    <input
                      id="topup"
                      type="number"
                      min="1"
                      step="1"
                      value={topup}
                      onChange={(e) => setTopup(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <button
                    onClick={topUp}
                    disabled={topupBusy || sending}
                    className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-black sm:w-auto"
                  >
                    {topupBusy ? "Opening…" : "Top up wallet"}
                  </button>
                </div>
                {errors.topup && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {errors.topup}
                  </p>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <h3 className="mb-4 font-bold">Booking summary</h3>
                <dl className="space-y-4">
                  {summary.map(([label, value, target]) => (
                    <div
                      key={label}
                      className="flex min-w-0 items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <dt className="text-xs text-zinc-500">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-medium">
                          {value}
                        </dd>
                      </div>
                      <button
                        disabled={locked}
                        onClick={() => {
                          go(target);
                          if (target === 2) heading.current?.focus();
                        }}
                        className="shrink-0 text-xs font-bold underline"
                        aria-label={`Edit ${label.toLowerCase()}`}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {bookingError && (
              <div
                role="alert"
                className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10"
              >
                <p>{bookingError}</p>
                {submission && (
                  <p className="mt-2">
                    Retry uses the same booking reference to avoid duplicates.
                    Check{" "}
                    <Link
                      className="underline"
                      href="/main/profile?tab=deliveries"
                    >
                      My parcels
                    </Link>{" "}
                    if you are unsure whether it was created.
                  </p>
                )}
              </div>
            )}
          </div>
          <aside
            className={`${cardClass} min-h-0 lg:sticky lg:top-24 lg:min-h-[210px]`}
            aria-label="Delivery estimate"
            aria-live="polite"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Your delivery estimate
            </p>
            {quote ? (
              <>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 lg:block">
                  <p className="text-2xl font-black sm:text-3xl">
                    {formatNaira(quote.fare)}
                  </p>
                  <p className="text-xs sm:text-sm lg:mt-3">
                    {quote.distanceKm.toFixed(1)} km · about{" "}
                    {Math.ceil(quote.estimatedDurationMinutes)} min
                  </p>
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {fields.size.toLowerCase()} parcel
                </p>
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Travel estimate only. Collection time depends on rider
                  availability.
                </p>
              </>
            ) : (
              <div className="mt-5 text-sm text-zinc-500">
                {quoteLoading ? (
                  <p role="status" className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Getting your quote…
                  </p>
                ) : quoteError ? (
                  <>
                    <p role="alert" className="text-red-600">
                      {quoteError}
                    </p>
                    <button
                      onClick={retryQuote}
                      className="mt-3 font-bold underline"
                    >
                      Retry quote
                    </button>
                  </>
                ) : (
                  "Choose pickup, drop-off and parcel size to see your fare."
                )}
              </div>
            )}
          </aside>
        </div>
        <footer className="sticky bottom-16 z-20 mt-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4 md:bottom-3">
          <div className="order-2 flex w-full items-center justify-between gap-3 sm:order-1 sm:w-auto sm:justify-start">
            {step > 0 && (
              <button
                disabled={locked}
                onClick={() => go(step - 1)}
                className="flex items-center gap-1 text-sm font-bold disabled:opacity-40"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <button
              disabled={sending}
              onClick={discard}
              className="text-xs text-zinc-500 underline"
            >
              Discard draft
            </button>
          </div>
          <button
            onClick={() =>
              step === 0
                ? go(1)
                : step === 1
                  ? validateContacts() && go(2)
                  : book()
            }
            disabled={
              sending ||
              !quote ||
              (step < 2 && locked) ||
              (step === 2 &&
                paymentMethod === "WALLET" &&
                (walletLoading || wallet === null || Boolean(insufficient)))
            }
            className="order-1 flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-center text-sm font-bold leading-tight text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 sm:min-h-0 sm:w-auto sm:px-5"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Booking…
              </>
            ) : step < 2 ? (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            ) : (
              `${submission ? "Retry booking" : paymentMethod === "CARD" ? "Continue to payment" : scheduleLater ? "Schedule parcel" : "Book parcel"}${quote ? ` · ${formatNaira(quote.fare)}` : ""}`
            )}
          </button>
        </footer>
      </div>
      {mapKind && (
        <DeliveryMapPicker
          open
          kind={mapKind}
          initialPosition={mapKind === "pickup" ? pickupPos : dropoffPos}
          initialAddress={
            mapKind === "pickup"
              ? fields.pickupAddress
              : fields.destinationAddress
          }
          onClose={() => setMapKind(null)}
          onConfirm={(position, address) => {
            selectLocation(mapKind, position, address);
            setMapKind(null);
          }}
        />
      )}
    </div>
  );
}
