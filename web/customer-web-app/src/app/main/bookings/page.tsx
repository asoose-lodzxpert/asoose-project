"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BedDouble, CalendarDays, ChevronRight, Loader2, Users } from "lucide-react";
import { PropertyService, type Booking } from "@/services/property.service";

const money = (value: number) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const date = (value: string) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { setItems((await PropertyService.bookings(1, 20, token)).bookings || []); }
    catch (e: any) { setError(e?.message || "Your bookings could not be loaded."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (status === "authenticated") load(); else if (status === "unauthenticated") setLoading(false); }, [status, load]);

  if (status === "unauthenticated") return <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="text-2xl font-black">Sign in to see your bookings</h1><Link href="/sign-in?callbackUrl=/main/bookings" className="mt-5 inline-block rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black">Sign in</Link></div>;

  return <div className="min-h-screen bg-[#f7f7f5] pb-28 dark:bg-[#0a0a0a] md:pb-12"><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-600">Your trips</p><h1 className="mt-1 text-3xl font-black tracking-tight dark:text-white">Bookings</h1><p className="mt-2 text-sm text-gray-500">Manage upcoming and previous accommodation.</p></div><Link href="/main/stays" className="hidden rounded-xl bg-black px-4 py-3 text-xs font-black text-white sm:block dark:bg-white dark:text-black">Find accommodation</Link></div>
    {loading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-500" /></div> : error ? <div className="mt-8 rounded-3xl bg-white p-10 text-center dark:bg-[#151515] dark:text-white"><p className="font-bold">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-black px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-black">Retry</button></div> : items.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-gray-300 p-12 text-center dark:border-white/10 dark:text-white"><BedDouble className="mx-auto h-12 w-12 text-gray-300" /><h2 className="mt-4 text-xl font-black">No bookings yet</h2><p className="mt-2 text-sm text-gray-500">Your next accommodation booking starts here.</p><Link href="/main/stays" className="mt-5 inline-block rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black">Explore accommodation</Link></div> : <div className="mt-8 space-y-4">{items.map((booking) => <Link href={`/main/bookings/${booking.id}`} key={booking.id} className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#151515] sm:flex-row"><div className="relative aspect-[16/9] bg-gray-100 sm:aspect-auto sm:w-56">{booking.propertyImage ? <Image src={booking.propertyImage} alt={booking.propertyName} fill sizes="224px" className="object-cover" /> : <BedDouble className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-gray-300" />}</div><div className="flex flex-1 items-center gap-4 p-5 sm:p-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400">{booking.status.replaceAll("_", " ")}</span><span className="text-xs font-bold text-gray-400">{booking.bookingNumber}</span></div><h2 className="mt-3 truncate text-lg font-black dark:text-white">{booking.propertyName}</h2><p className="mt-1 text-sm text-gray-500">{booking.roomTypeName}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-gray-500"><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{date(booking.checkIn)} – {date(booking.checkOut)}</span><span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{booking.guests} guests</span></div></div><div className="shrink-0 text-right"><p className="text-sm font-black dark:text-white">{money(booking.total)}</p><ChevronRight className="ml-auto mt-3 h-5 w-5 text-gray-300 transition group-hover:translate-x-1" /></div></div></Link>)}</div>}
  </main></div>;
}
