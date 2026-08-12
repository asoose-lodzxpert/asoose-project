"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDouble, Car, ChevronDown, Grid3X3, History, Package, ShoppingBag, Wallet, X } from "lucide-react";

export const SERVICES = [
  { label: "Order food & items", shortLabel: "Order", description: "Restaurants, groceries and stores", href: "/main/store", icon: ShoppingBag, accent: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  { label: "Book a ride", shortLabel: "Ride", description: "Request a safe ride across your city", href: "/main/ride", icon: Car, accent: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  { label: "Send a delivery", shortLabel: "Deliver", description: "Door-to-door parcel delivery", href: "/main/delivery", icon: Package, accent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300" },
  { label: "Find accommodation", shortLabel: "Accommodation", description: "Hotels, apartments and shortlets", href: "/main/stays", icon: BedDouble, accent: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300" },
] as const;

export function DesktopServicesMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const active = SERVICES.some((item) => pathname.startsWith(item.href));

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div ref={ref} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${active || open ? "bg-white text-gray-950 shadow-sm dark:bg-zinc-800 dark:text-white" : "text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/5"}`}>
      <Grid3X3 className="h-4 w-4 text-yellow-600" /> Services <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute right-0 top-full z-50 mt-3 w-[430px] overflow-hidden rounded-3xl border border-black/5 bg-white p-3 shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-[#151515]">
      <div className="px-3 pb-2 pt-1"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">What would you like to do?</p></div>
      <div className="grid grid-cols-2 gap-2">{SERVICES.map((item) => <Link href={item.href} key={item.href} onClick={() => setOpen(false)} className={`group rounded-2xl border p-3.5 transition hover:border-yellow-300 hover:bg-gray-50 dark:hover:bg-white/5 ${pathname.startsWith(item.href) ? "border-yellow-300 bg-yellow-50/60 dark:border-yellow-500/30 dark:bg-yellow-500/5" : "border-black/5 dark:border-white/5"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.accent}`}><item.icon className="h-4.5 w-4.5" /></span><span className="mt-3 block text-sm font-black">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-gray-500">{item.description}</span></Link>)}</div>
      <div className="mt-2 flex gap-2 border-t border-black/5 p-2 pt-3 dark:border-white/5"><Link href="/main/profile?tab=wallet" onClick={() => setOpen(false)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-black dark:bg-white/5"><Wallet className="h-4 w-4" /> Wallet</Link><Link href="/main/profile" onClick={() => setOpen(false)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-black dark:bg-white/5"><History className="h-4 w-4" /> Activity</Link></div>
    </div>}
  </div>;
}

export function MobileServicesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Asoose services"><button type="button" aria-label="Close services" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" /><div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-2xl dark:bg-[#151515]"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-white/10" /><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">Asoose services</p><h2 className="mt-1 text-2xl font-black dark:text-white">What do you need?</h2></div><button type="button" onClick={onClose} className="rounded-full bg-gray-100 p-2.5 dark:bg-white/5"><X className="h-5 w-5" /></button></div><div className="mt-5 grid grid-cols-2 gap-3">{SERVICES.map((item) => <Link href={item.href} onClick={onClose} key={item.href} className={`rounded-3xl border p-4 ${pathname.startsWith(item.href) ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10" : "border-black/5 bg-gray-50 dark:border-white/5 dark:bg-white/[0.03]"}`}><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.accent}`}><item.icon className="h-5 w-5" /></span><span className="mt-3 block text-sm font-black dark:text-white">{item.shortLabel}</span><span className="mt-1 block text-[10px] leading-4 text-gray-500">{item.description}</span></Link>)}</div><div className="mt-3 grid grid-cols-2 gap-3"><Link href="/main/profile?tab=wallet" onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl border border-black/5 py-3 text-xs font-black dark:border-white/10"><Wallet className="h-4 w-4" /> Wallet</Link><Link href="/main/profile" onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl border border-black/5 py-3 text-xs font-black dark:border-white/10"><History className="h-4 w-4" /> My activity</Link></div></div></div>;
}
