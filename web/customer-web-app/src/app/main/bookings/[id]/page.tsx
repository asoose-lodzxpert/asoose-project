"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { ArrowLeft, BedDouble, Clock, CreditCard, Loader2, ReceiptText, Users, Wallet } from "lucide-react";
import { PropertyService, type Booking } from "@/services/property.service";

const money = (value: number) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const date = (value: string) => new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const cancellable = (status: string) => ["PENDING", "PENDING_PAYMENT", "CONFIRMED"].includes(status);

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { setBooking(await PropertyService.booking(id, token)); }
    catch (e: any) { setError(e?.message || "Booking could not be loaded."); }
    finally { setLoading(false); }
  }, [id, token]);
  useEffect(() => { load(); }, [load]);

  const pay = async () => {
    if (!token || !booking) return;
    setWorking(true);
    try { const result = await PropertyService.payment(booking.id, token); if (!result.authorizationUrl.startsWith("https://checkout.paystack.com/")) throw new Error("Invalid payment link returned."); localStorage.setItem("pending_booking_data", JSON.stringify({ bookingId: booking.id, returnTo: location.pathname })); window.location.href = result.authorizationUrl; }
    catch (e: any) { toast.error(e?.message || "Could not generate a payment link."); setWorking(false); }
  };

  const cancel = async () => {
    if (!token || !booking) return;
    const reason = window.prompt("Why are you cancelling this booking?");
    if (!reason?.trim()) return;
    setWorking(true);
    try { setBooking(await PropertyService.cancel(booking.id, reason.trim(), token)); toast.success("Booking cancelled."); }
    catch (e: any) { toast.error(e?.message || "Booking could not be cancelled."); }
    finally { setWorking(false); }
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-500" /></div>;
  if (!booking || error) return <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="text-2xl font-black">Booking unavailable</h1><p className="mt-2 text-gray-500">{error}</p><button onClick={load} className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-black text-white">Try again</button></div>;

  return <div className="min-h-screen bg-[#f7f7f5] pb-28 dark:bg-[#0a0a0a] dark:text-white md:pb-12"><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><Link href="/main/bookings" className="inline-flex items-center gap-2 text-sm font-black text-gray-500"><ArrowLeft className="h-4 w-4" /> All bookings</Link>
    <div className="mt-6 overflow-hidden rounded-[2rem] bg-[#171714] text-white"><div className="grid sm:grid-cols-[280px_1fr]"><div className="relative min-h-56 bg-white/5">{booking.propertyImage ? <Image src={booking.propertyImage} alt={booking.propertyName} fill sizes="280px" className="object-cover" /> : <BedDouble className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-white/25" />}</div><div className="p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">{booking.status.replaceAll("_", " ")}</span><span className="text-xs font-bold text-white/45">{booking.bookingNumber}</span></div><h1 className="mt-5 text-3xl font-black tracking-tight">{booking.propertyName}</h1><p className="mt-2 text-white/60">{booking.roomTypeName}</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Check in</p><p className="mt-2 text-sm font-bold">{date(booking.checkIn)}</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Check out</p><p className="mt-2 text-sm font-bold">{date(booking.checkOut)}</p></div></div></div></div></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"><div className="space-y-5"><section className="rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-black">Accommodation details</h2><div className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div className="flex items-start gap-3"><Clock className="h-5 w-5 text-yellow-600" /><div><p className="text-xs text-gray-400">Duration</p><p className="font-black">{booking.nights} nights</p></div></div><div className="flex items-start gap-3"><Users className="h-5 w-5 text-yellow-600" /><div><p className="text-xs text-gray-400">Guests</p><p className="font-black">{booking.guests} guests</p></div></div><div className="flex items-start gap-3"><BedDouble className="h-5 w-5 text-yellow-600" /><div><p className="text-xs text-gray-400">Rooms</p><p className="font-black">{booking.unitsBooked}</p></div></div></div>{booking.specialRequests && <div className="mt-6 rounded-2xl bg-gray-50 p-4 dark:bg-white/5"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Special requests</p><p className="mt-2 text-sm">{booking.specialRequests}</p></div>}{booking.cancellationReason && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"><strong>Cancellation reason:</strong> {booking.cancellationReason}</div>}</section></div>
    <aside className="rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#151515]"><h2 className="flex items-center gap-2 font-black"><ReceiptText className="h-5 w-5" /> Payment summary</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-gray-500"><span>{money(booking.pricePerNight)} × {booking.nights} nights</span><span>{money(booking.subtotal)}</span></div><div className="flex justify-between text-gray-500"><span>Service fee</span><span>{money(booking.serviceFee)}</span></div><div className="flex justify-between border-t pt-4 text-lg font-black dark:border-white/10"><span>Total</span><span>{money(booking.total)}</span></div></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-white/5"><span className="flex items-center gap-2 text-sm font-bold">{booking.paymentMethod === "WALLET" ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}{booking.paymentMethod === "WALLET" ? "Wallet" : "Pay online"}</span><span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{booking.paymentStatus}</span></div>{booking.paymentMethod === "CARD" && booking.paymentStatus === "PENDING" && <button disabled={working} onClick={pay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-black">{working && <Loader2 className="h-4 w-4 animate-spin" />} Complete payment</button>}{cancellable(booking.status) && <button disabled={working} onClick={cancel} className="mt-3 w-full rounded-2xl border border-red-200 py-3 text-sm font-black text-red-600 dark:border-red-900/40">Cancel booking</button>}</aside></div>
  </main></div>;
}
