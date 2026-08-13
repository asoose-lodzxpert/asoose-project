"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { ArrowLeft, BedDouble, Check, ChevronRight, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck, Star, Wallet, Wifi } from "lucide-react";
import { PropertyService, type BookingQuote, type Property, type PropertyRoomType } from "@/services/property.service";
import { WalletService } from "@/services/wallet.service";

const money = (value: number) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
// Upcoming Friday-to-Sunday range (today counts as "upcoming" if it's already Friday).
const nextWeekendRange = () => {
  const checkInDate = addDays(today(), (5 - new Date().getDay() + 7) % 7);
  return { checkInDate, checkOutDate: addDays(checkInDate, 2) };
};

export default function StayDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [room, setRoom] = useState<PropertyRoomType | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [units, setUnits] = useState(1);
  const [requests, setRequests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "CARD">("CARD");
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const idempotency = useRef(crypto.randomUUID());

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await PropertyService.get(id);
      setProperty(data);
      setRoom(data.roomTypes.find((item) => item.isActive) || null);
    } catch (e: any) { setError(e?.message || "This accommodation could not be loaded."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!token) return;
    WalletService.getMyWallet(token).then((data) => setWalletBalance(data.balance)).catch(() => setWalletBalance(null));
  }, [token]);
  useEffect(() => { setQuote(null); idempotency.current = crypto.randomUUID(); }, [room?.id, checkIn, checkOut, guests, units, paymentMethod]);

  const gallery = useMemo(() => property ? [...new Set([property.image, ...property.images].filter(Boolean) as string[])] : [], [property]);
  const secondaryImages = gallery.slice(1, 5);
  const canQuote = Boolean(room && checkIn && checkOut && checkOut > checkIn && guests > 0 && units > 0);
  const nights = checkIn && checkOut && checkOut > checkIn
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const weekend = nextWeekendRange();
  const isWeekendSelected = checkIn === weekend.checkInDate && checkOut === weekend.checkOutDate;

  // Quick-select presets — keeps the check-in date if one is already set (and still valid),
  // so tapping "2 nights" after picking a start date just extends the stay from there.
  const applyStayLength = (stayNights: number) => {
    const start = checkIn && checkIn >= today() ? checkIn : today();
    setCheckIn(start);
    setCheckOut(addDays(start, stayNights));
  };
  const applyWeekend = () => { setCheckIn(weekend.checkInDate); setCheckOut(weekend.checkOutDate); };

  const getQuote = async () => {
    if (!room || !canQuote) { toast.info("Choose a room and valid check-in and check-out dates."); return; }
    setQuoting(true);
    try {
      const result = await PropertyService.quote({ roomTypeId: room.id, checkIn, checkOut, guests, unitsBooked: units }, token);
      setQuote(result);
    } catch (e: any) { toast.error(e?.message || "Could not calculate this booking."); }
    finally { setQuoting(false); }
  };

  const createBooking = async () => {
    if (!quote || !room) return getQuote();
    if (sessionStatus !== "authenticated" || !token) { router.push(`/sign-in?callbackUrl=${encodeURIComponent(location.pathname)}`); return; }
    if (paymentMethod === "WALLET" && walletBalance !== null && walletBalance < quote.total) { toast.error("Your wallet balance is too low. Top up or pay online."); return; }
    setBooking(true);
    try {
      const result = await PropertyService.create({ roomTypeId: room.id, checkIn, checkOut, guests, unitsBooked: units, specialRequests: requests.trim(), paymentMethod, idempotencyKey: idempotency.current }, token);
      if (result.authorizationUrl) {
        if (!result.authorizationUrl.startsWith("https://checkout.paystack.com/")) throw new Error("Invalid payment link returned.");
        localStorage.setItem("pending_booking_data", JSON.stringify({ bookingId: result.booking.id, returnTo: `/main/bookings/${result.booking.id}` }));
        window.location.href = result.authorizationUrl;
        return;
      }
      toast.success("Accommodation booked successfully.");
      router.push(`/main/bookings/${result.booking.id}`);
    } catch (e: any) { toast.error(e?.message || "Booking could not be completed."); }
    finally { setBooking(false); }
  };

  const topup = async () => {
    const amount = Number(topupAmount);
    if (!token || !Number.isFinite(amount) || amount < 100) { toast.info("Enter a valid top-up amount."); return; }
    setToppingUp(true);
    try {
      const result = await WalletService.initializeTopup(amount, token);
      if (!result.authorizationUrl.startsWith("https://checkout.paystack.com/")) throw new Error("Invalid payment link returned.");
      localStorage.setItem("pending_wallet_topup", JSON.stringify({ reference: result.reference, returnTo: location.pathname }));
      window.location.href = result.authorizationUrl;
    } catch (e: any) { toast.error(e?.message || "Could not start wallet top-up."); setToppingUp(false); }
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-yellow-500" /></div>;
  if (!property || error) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><BedDouble className="mx-auto h-12 w-12 text-gray-300" /><h1 className="mt-4 text-2xl font-black">Accommodation unavailable</h1><p className="mt-2 text-gray-500">{error}</p><button onClick={load} className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-black text-white">Try again</button></div>;

  return (
    <div className="min-h-screen bg-[#f7f7f5] pb-28 text-[#171714] dark:bg-[#0a0a0a] dark:text-white md:pb-12">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/main/stays" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to accommodation</Link>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-600">{property.propertyType.replaceAll("_", " ")}</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{property.name}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><MapPin className="h-4 w-4" />{property.address}</p></div>
          <div className="flex items-center gap-2 text-sm font-bold"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{property.rating || "New"}<span className="text-gray-400">· {property.totalReviews} reviews</span></div>
        </div>

        <div className={`grid h-[320px] gap-2 overflow-hidden rounded-3xl sm:h-[460px] ${secondaryImages.length > 0 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          <div className="relative bg-gray-200 dark:bg-white/5">{gallery[0] ? <Image src={gallery[0]} alt={property.name} fill priority sizes={secondaryImages.length > 0 ? "(max-width: 640px) 100vw, 50vw" : "100vw"} className="object-cover" /> : <div className="flex h-full items-center justify-center"><BedDouble className="h-14 w-14 text-gray-400" /></div>}</div>
          {secondaryImages.length > 0 && (
            <div className={`hidden gap-2 sm:grid ${secondaryImages.length === 1 ? "grid-cols-1" : secondaryImages.length === 2 ? "grid-cols-1 grid-rows-2" : "grid-cols-2 grid-rows-2"}`}>
              {secondaryImages.map((image, index) => (
                <div key={image} className={`relative bg-gray-200 dark:bg-white/5 ${secondaryImages.length === 3 && index === 0 ? "row-span-2" : ""}`}>
                  <Image src={image} alt={`${property.name} ${index + 2}`} fill sizes={secondaryImages.length === 1 ? "50vw" : "25vw"} className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_390px] lg:items-start">
          <div className="space-y-8">
            <section className="rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#151515] sm:p-8"><h2 className="text-xl font-black">About this place</h2><p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">{property.description || "Comfortable accommodation in the heart of the city."}</p><div className="mt-6 flex flex-wrap gap-3"><span className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-bold dark:bg-white/5"><Clock className="h-4 w-4" /> Check in {property.checkInTime || "Confirm with host"}</span><span className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-bold dark:bg-white/5"><Clock className="h-4 w-4" /> Check out {property.checkOutTime || "Confirm with host"}</span></div></section>
            {property.amenities.length > 0 && <section><h2 className="text-xl font-black">What this place offers</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{property.amenities.map((amenity) => <div key={amenity} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 text-sm font-bold dark:border-white/10 dark:bg-[#151515]"><Wifi className="h-4 w-4 text-yellow-600" />{amenity}</div>)}</div></section>}
            <section><h2 className="text-xl font-black">Choose a room</h2><div className="mt-4 space-y-3">{property.roomTypes.filter((item) => item.isActive).map((item) => <button type="button" onClick={() => setRoom(item)} key={item.id} className={`flex w-full items-center gap-4 rounded-3xl border bg-white p-4 text-left transition dark:bg-[#151515] sm:p-5 ${room?.id === item.id ? "border-yellow-400 ring-2 ring-yellow-400/20" : "border-black/5 hover:border-yellow-300 dark:border-white/10"}`}><div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-white/5">{(item.image || item.images[0]) ? <Image src={item.image || item.images[0]} alt={item.name} fill sizes="96px" className="object-cover" /> : <BedDouble className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-gray-400" />}</div><div className="min-w-0 flex-1"><h3 className="font-black">{item.name}</h3><p className="mt-1 line-clamp-1 text-xs text-gray-500">{item.description || `Comfortable for up to ${item.maxGuests} guests`}</p><p className="mt-2 text-sm"><span className="font-black">{money(item.pricePerNight)}</span> / night</p></div>{room?.id === item.id ? <span className="rounded-full bg-yellow-400 p-2 text-black"><Check className="h-4 w-4" /></span> : <ChevronRight className="h-5 w-5 text-gray-300" />}</button>)}</div></section>
          </div>

          <aside className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-[#151515] sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-black">Reserve accommodation</h2><p className="mt-1 text-xs text-gray-500">You won’t be charged until you confirm.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyStayLength(1)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${nights === 1 && !isWeekendSelected ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-gray-200 text-gray-600 hover:border-yellow-300 dark:border-white/10 dark:text-gray-300"}`}>1 night</button>
              <button type="button" onClick={() => applyStayLength(2)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${nights === 2 && !isWeekendSelected ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-gray-200 text-gray-600 hover:border-yellow-300 dark:border-white/10 dark:text-gray-300"}`}>2 nights</button>
              <button type="button" onClick={applyWeekend} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${isWeekendSelected ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-gray-200 text-gray-600 hover:border-yellow-300 dark:border-white/10 dark:text-gray-300"}`}>Weekend</button>
              <button type="button" onClick={() => applyStayLength(7)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${nights === 7 && !isWeekendSelected ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-gray-200 text-gray-600 hover:border-yellow-300 dark:border-white/10 dark:text-gray-300"}`}>1 week</button>
            </div>
            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10"><label className="border-r border-gray-200 p-3 dark:border-white/10"><span className="block text-[10px] font-black uppercase tracking-wider">Check in</span><input min={today()} type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full bg-transparent text-xs font-bold outline-none" /></label><label className="p-3"><span className="block text-[10px] font-black uppercase tracking-wider">Check out</span><input min={checkIn ? addDays(checkIn, 1) : today()} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full bg-transparent text-xs font-bold outline-none" /></label></div>
            {nights > 0 && <p className="mt-2 text-xs font-bold text-gray-500">{nights} night{nights > 1 ? "s" : ""} stay</p>}
            <div className="mt-3 space-y-2">{[["Guests", guests, setGuests], ["Rooms", units, setUnits]].map(([label, value, setter]) => <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 dark:bg-white/5"><span className="text-sm font-bold">{String(label)}</span><div className="flex items-center gap-3"><button type="button" onClick={() => (setter as (n:number)=>void)(Math.max(1, Number(value) - 1))} className="rounded-full border p-1.5 dark:border-white/10"><Minus className="h-3 w-3" /></button><span className="w-4 text-center text-sm font-black">{Number(value)}</span><button type="button" onClick={() => (setter as (n:number)=>void)(Number(value) + 1)} className="rounded-full border p-1.5 dark:border-white/10"><Plus className="h-3 w-3" /></button></div></div>)}</div>
            <textarea value={requests} onChange={(e) => setRequests(e.target.value)} maxLength={500} placeholder="Special requests (optional)" className="mt-3 min-h-20 w-full resize-none rounded-2xl border border-gray-200 bg-transparent p-3 text-sm outline-none focus:border-yellow-400 dark:border-white/10" />
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod("CARD")} className={`rounded-2xl border p-3 text-left ${paymentMethod === "CARD" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10" : "border-gray-200 dark:border-white/10"}`}><span className="block text-sm font-black">Pay online</span><span className="text-[10px] text-gray-500">Secure Paystack</span></button><button type="button" onClick={() => setPaymentMethod("WALLET")} className={`rounded-2xl border p-3 text-left ${paymentMethod === "WALLET" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10" : "border-gray-200 dark:border-white/10"}`}><span className="flex items-center gap-1 text-sm font-black"><Wallet className="h-3.5 w-3.5" /> Wallet</span><span className="text-[10px] text-gray-500">{walletBalance == null ? "Sign in to view" : money(walletBalance)}</span></button></div>
            {paymentMethod === "WALLET" && token && <div className="mt-3 flex gap-2"><input type="number" min="100" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="Top-up amount" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-transparent px-3 text-xs outline-none dark:border-white/10" /><button type="button" disabled={toppingUp} onClick={topup} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black dark:bg-white/10">{toppingUp ? "Opening…" : "Top up"}</button></div>}
            {quote ? <div className="mt-5 space-y-2 border-t border-dashed pt-4 text-sm dark:border-white/10"><div className="flex justify-between text-gray-500"><span>{money(quote.pricePerNight)} × {quote.nights} nights × {quote.unitsBooked}</span><span>{money(quote.subtotal)}</span></div><div className="flex justify-between text-gray-500"><span>Service fee</span><span>{money(quote.serviceFee)}</span></div><div className="flex justify-between pt-2 text-base font-black"><span>Total</span><span>{money(quote.total)}</span></div></div> : <button type="button" disabled={!canQuote || quoting} onClick={getQuote} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-sm font-black disabled:opacity-50 dark:bg-white/10">{quoting && <Loader2 className="h-4 w-4 animate-spin" />} See price</button>}
            <button type="button" disabled={booking || (!quote && !canQuote)} onClick={createBooking} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-black hover:bg-yellow-300 disabled:opacity-50">{booking && <Loader2 className="h-4 w-4 animate-spin" />}{quote ? "Confirm booking" : "Get booking quote"}</button>
            <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400"><ShieldCheck className="h-4 w-4" /> Secure booking and payment</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
