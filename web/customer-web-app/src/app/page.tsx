"use client"
import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Wallet,
  UserCheck,
  Lock,
  ChevronDown,
  ShoppingBag,
  CarFront,
  PackageCheck,
} from "lucide-react";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { trackMetaCustomEvent } from "@/lib/meta-pixel";

// ── Per-image blur placeholders ───────────────────────────────────────────────
const BLUR_MAP: Record<string, string> = {
  "/marketplace.webp":
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAD/9k=",
  "/ride.webp":
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABcQAAMBAAAAAAAAAAAAAAAAAAABERL/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AnVQD/9k=",
  "/delivery.webp":
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABcQAAMBAAAAAAAAAAAAAAAAAAABIhH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AlkQD/9k=",
  "/vendor.webp":
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABcQAAMBAAAAAAAAAAAAAAAAAAABESH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmRUD/9k=",
  "/driver.webp":
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABcQAAMBAAAAAAAAAAAAAAAAAAABEjL/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AkkQD/9k=",
};

const SERVICE_KEYS = ["food", "ride", "package"] as const;

// Apple SVG icon
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.14-2.53-2.14-3.5-3.09-8.48 2-10.92 1.34-.65 2.62-.2 3.65-.2 1.27 0 2.21.72 2.87.72.65 0 2.05-.88 3.49-.75 2.49.19 3.98 1.5 4.38 1.87-.03.05-2.62 1.52-2.58 4.63.02 3.09 2.72 4.17 2.92 4.23-.05.19-.42 1.44-1.38 2.85M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.32.74-2.99 1.53-.61.72-1.15 1.86-1.01 2.98 1.17.09 2.33-.71 2.93-1.4z" />
    </svg>
  );
}

// Google Play SVG icon
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
    </svg>
  );
}

// ── Store button pair — always visible on all screen sizes ────────────────────
function StoreButtons({
  androidUrl,
  iosUrl,
  darkMode,
  appName = "customer",
  size = "sm",
}: {
  androidUrl: string;
  iosUrl: string;
  darkMode: boolean;
  appName?: "customer" | "merchant" | "rider";
  size?: "sm" | "lg";
}) {
  const isLg = size === "lg";

  const btnBase = [
    "inline-flex items-center gap-3 rounded-2xl border-2 transition-all duration-200",
    "hover:scale-[1.03] active:scale-[0.97]",
    isLg ? "px-6 py-3.5" : "px-4 py-2.5",
    darkMode
      ? "border-white/20 hover:border-yellow-400 hover:bg-yellow-400/5 text-white"
      : "border-black/12 hover:border-yellow-500 hover:bg-yellow-400/8 text-gray-900",
  ].join(" ");

  const iconCls = isLg ? "w-6 h-6 flex-shrink-0" : "w-5 h-5 flex-shrink-0";
  const sublabel = isLg ? "text-[10px]" : "text-[9px]";
  const name = isLg ? "text-sm" : "text-[13px]";

  return (
    // `w-full` on mobile so buttons fill their container;
    // `sm:w-auto` on ≥640 px so they shrink to content width and sit side-by-side
    <div className="flex w-full sm:w-auto gap-3">
      {/* App Store */}
      <a
        href={iosUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackMetaCustomEvent("AppDownloadClick", {
            app: appName,
            platform: "ios",
          })
        }
        className={`${btnBase} flex-1 sm:flex-none`}
      >
        <AppleIcon className={iconCls} />
        <div className="text-left leading-none">
          <div className={`${sublabel} uppercase tracking-widest opacity-50 font-semibold mb-0.5`}>
            Download on
          </div>
          <div className={`${name} font-bold`}>App Store</div>
        </div>
      </a>

      {/* Google Play */}
      <a
        href={androidUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackMetaCustomEvent("AppDownloadClick", {
            app: appName,
            platform: "android",
          })
        }
        className={`${btnBase} flex-1 sm:flex-none`}
      >
        <PlayIcon className={iconCls} />
        <div className="text-left leading-none">
          <div className={`${sublabel} uppercase tracking-widest opacity-50 font-semibold mb-0.5`}>
            Get it on
          </div>
          <div className={`${name} font-bold`}>Google Play</div>
        </div>
      </a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AsooseLanding() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [activeService, setActiveService] = useState<"ride" | "food" | "package">("food");
  const [isPaused, setIsPaused] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const darkMode = resolvedTheme === "dark";

  const CUSTOMER_ANDROID_URL =
    "https://play.google.com/store/apps/details?id=com.asoose.app";
  const CUSTOMER_IOS_URL = "https://apps.apple.com/ng/app/asoose/id6781271502";
  const RIDER_ANDROID_URL =
    "https://play.google.com/store/apps/details?id=com.asoose.rider.app";
  const RIDER_IOS_URL =
    "https://apps.apple.com/ng/app/asoose/id6781271502";
  const MERCHANT_ANDROID_URL =
    "https://play.google.com/store/apps/details?id=com.asoose.vendor.app";
  const MERCHANT_IOS_URL =
    "https://apps.apple.com/ng/app/asoose/id6781271502";

  const SERVICE_DATA = {
    food: {
      eyebrow: "Food, groceries and essentials",
      title: "Your city, delivered.",
      desc: "Order meals, groceries, pharmacy items and everyday essentials from trusted stores near you.",
      cta: "Start shopping",
      link: "/main/store",
      icon: ShoppingBag,
      image:
        "https://res.cloudinary.com/dgwnjuvlx/image/upload/f_auto,q_auto:best,w_3200,c_limit/v1787058027/marketplace_copy_ibl05r.jpg",
    },
    ride: {
      eyebrow: "Reliable rides, when you need them",
      title: "Move with confidence.",
      desc: "Request a safe, dependable ride with verified drivers, clear pricing and live trip tracking.",
      cta: "Book a ride",
      link: "/main/ride",
      icon: CarFront,
      image:
        "https://res.cloudinary.com/dgwnjuvlx/image/upload/f_auto,q_auto:best,w_3200,c_limit/v1787058021/ride_copy_mvl8ho.jpg",
    },
    package: {
      eyebrow: "Simple, secure local delivery",
      title: "Send it with ease.",
      desc: "Move documents, parcels and larger items across the city with transparent pricing and live tracking.",
      cta: "Send a package",
      link: "/main/delivery",
      icon: PackageCheck,
      image: "/delivery.webp",
    },
  };

  const FAQ_DATA = [
    {
      q: "How are prices calculated?",
      a: "Prices are calculated based on distance, time, and service type. You'll always see the total upfront — no surprises.",
    },
    {
      q: "How do I pay?",
      a: "Pay safely using your wallet, bank card, or bank transfer. Transactions are fully encrypted for your security.",
    },
    {
      q: "What if there's an issue?",
      a: "Our 24/7 support team is ready in the app to help with any issues — from trip problems to delivery questions.",
    },
    {
      q: "Is it safe?",
      a: "All riders are verified, trips are GPS-tracked, and emergency assistance is available at all times for your peace of mind.",
    },
    {
      q: "Can I cancel a ride or delivery?",
      a: "Yes — you can cancel anytime. Fees (if any) are shown before confirmation.",
    },
    {
      q: "How do I track my order or package?",
      a: "Track your ride or delivery live on the map, right in the app.",
    },
  ];

  const handleNext = useCallback(() => {
    setActiveService((current) => {
      const currentIndex = SERVICE_KEYS.indexOf(current);
      const nextIndex = (currentIndex + 1) % SERVICE_KEYS.length;
      return SERVICE_KEYS[nextIndex];
    });
  }, []);

  useEffect(() => {
    if (!mounted || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(handleNext, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mounted, isPaused, handleNext]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main
        className={`flex-grow selection:bg-yellow-500/30 transition-colors duration-300 ${
          darkMode ? "bg-[#0a0a0a] text-gray-100" : "bg-white text-gray-900"
        }`}
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <header
          className="relative min-h-[760px] overflow-hidden bg-zinc-950 pt-16 text-white sm:min-h-[820px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {SERVICE_KEYS.map((service, index) => (
            <Image
              key={service}
              src={SERVICE_DATA[service].image}
              alt=""
              fill
              priority={index === 0}
              loading={index === 0 ? undefined : "eager"}
              sizes="100vw"
              className={`object-cover transition-opacity duration-700 ${
                activeService === service ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-transparent sm:via-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at center, white 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />

          <div className="relative z-10 mx-auto flex min-h-[650px] max-w-7xl items-center px-4 pb-40 pt-20 sm:px-6 sm:pb-44 sm:pt-24">
            <div className="max-w-4xl">
              <div className="mb-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-yellow-400 sm:text-xs">
                <span className="h-0.5 w-10 bg-yellow-400" />
                Shopping · Rides · Delivery
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl lg:text-[6.6rem]">
                Asoose is your all-in-one app
                <span className="block text-yellow-400">for everyday city life.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base font-medium leading-7 text-white/70 sm:text-xl sm:leading-8">
                Asoose connects you to trusted local stores, reliable drivers and couriers. Order food and essentials, request a ride, or send a package—all from one app.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href={SERVICE_DATA[activeService].link}
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-4 text-sm font-black text-black shadow-2xl shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98]"
                >
                  {SERVICE_DATA[activeService].cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#download"
                  className="rounded-xl border border-white/25 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  Download the app
                </Link>
              </div>
            </div>
          </div>

          {!isPaused && (
            <div className="absolute bottom-0 left-0 z-20 h-1 w-full bg-white/10">
              <div key={activeService} className="h-full w-full origin-left animate-[progress_5s_linear_forwards] bg-yellow-400" />
            </div>
          )}
        </header>

        {/* ── PRIMARY ACTIONS ───────────────────────────────────────────── */}
        <section className="relative z-20 mx-auto -mt-28 max-w-7xl px-4 sm:px-6">
          <div className="grid overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-[#151513] md:grid-cols-3">
            {SERVICE_KEYS.map((key) => {
              const Icon = SERVICE_DATA[key].icon;
              const active = activeService === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveService(key)}
                  aria-pressed={active}
                  className={`group relative flex min-h-40 items-start gap-4 border-b p-6 text-left transition md:border-b-0 md:border-r md:last:border-r-0 sm:p-8 ${
                    darkMode ? "border-white/10" : "border-black/[0.06]"
                  } ${active ? "bg-yellow-400 text-black" : "hover:bg-yellow-400/10"}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-black text-yellow-400" : "bg-yellow-400/15 text-yellow-600"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] opacity-55">
                      {key === "food" ? "Marketplace" : key === "ride" ? "Rides" : "Delivery"}
                    </span>
                    <span className="mt-2 block text-xl font-black tracking-tight">{SERVICE_DATA[key].title}</span>
                    <span className="mt-2 line-clamp-2 block text-xs font-medium leading-5 opacity-65">{SERVICE_DATA[key].desc}</span>
                  </span>
                  <ArrowRight className="absolute bottom-6 right-6 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-6 sm:pb-14 sm:pt-28">
          <div className="grid gap-8 border-b border-black/[0.06] pb-14 dark:border-white/10 sm:grid-cols-[1.2fr_1fr] sm:items-end">
            <h2 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl">
              One platform for shopping, rides and delivery.
            </h2>
            <p className="max-w-lg text-base leading-7 text-gray-500 sm:justify-self-end sm:text-lg">
              Whether you are buying dinner, heading across town or sending an item, Asoose helps you get it done from one simple experience.
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="overflow-hidden rounded-[2.5rem] bg-[#151513] px-6 py-10 text-white sm:px-10 sm:py-14 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-14 lg:py-16">
            <div className="mb-10 lg:mb-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-400">Simple from start to finish</p>
              <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.04em] sm:text-5xl">How Asoose works</h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/55 sm:text-base">Whatever you need around the city, the experience stays clear and predictable.</p>
            </div>

            <div className="divide-y divide-white/10">

            {[
              {
                icon: <MapPin className="text-yellow-500" size={20} />,
                title: "Choose a service",
                desc: "Ride, food, groceries, or delivery.",
              },
              {
                icon: <Wallet className="text-yellow-500" size={20} />,
                title: "Confirm price",
                desc: "See cost before you commit.",
              },
              {
                icon: <Clock className="text-yellow-500" size={20} />,
                title: "Track live",
                desc: "Follow progress in real time.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="group grid grid-cols-[auto_1fr] items-center gap-5 py-6 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10 transition-transform group-hover:-translate-y-0.5">
                    {step.icon}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Step {i + 1}</span>
                  <h3 className="mt-1 text-lg font-black">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/50">{step.desc}</p>
                </div>
                <span className="hidden text-5xl font-black text-white/[0.06] sm:block">0{i + 1}</span>
              </div>
            ))}
            </div>
          </div>
        </section>

        {/* ── PARTNER PATHS ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl border-t border-black/5 px-4 py-16 dark:border-white/5 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-2xl sm:mb-12">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-600">
              Build with Asoose
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">
              Your next opportunity is here.
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-500 sm:text-lg">
              Reach more customers as a merchant or earn on your own schedule as a rider.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {[
              {
                label: "For merchants",
                title: "Grow beyond your storefront.",
                desc: "Sell food, groceries and everyday goods while Asoose helps with orders, payments and delivery.",
                image: "/vendor.webp",
                alt: "Merchant preparing an Asoose order",
                points: ["Reach nearby customers", "Manage orders live"],
                androidUrl: MERCHANT_ANDROID_URL,
                iosUrl: MERCHANT_IOS_URL,
                appName: "merchant" as const,
              },
              {
                label: "For riders",
                title: "Earn on your schedule.",
                desc: "Provide rides or complete deliveries with transparent earnings, navigation and support in one app.",
                image: "/driver.webp",
                alt: "Asoose rider ready for a trip",
                points: ["Choose when you work", "Track earnings clearly"],
                androidUrl: RIDER_ANDROID_URL,
                iosUrl: RIDER_IOS_URL,
                appName: "rider" as const,
              },
            ].map((path) => (
              <article
                key={path.appName}
                className={`overflow-hidden rounded-[2rem] border ${
                  darkMode
                    ? "border-white/[0.08] bg-white/[0.035]"
                    : "border-black/[0.06] bg-[#fafaf8]"
                }`}
              >
                <div className="relative h-64 overflow-hidden bg-zinc-100 sm:h-72 dark:bg-zinc-900">
                  <Image
                    src={path.image}
                    alt={path.alt}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    quality={85}
                    placeholder="blur"
                    blurDataURL={BLUR_MAP[path.image]}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    {path.label}
                  </span>
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-2xl font-black tracking-[-0.025em] sm:text-3xl">{path.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">{path.desc}</p>
                  <div className="my-6 flex flex-wrap gap-2">
                    {path.points.map((point) => (
                      <span
                        key={point}
                        className="rounded-full bg-yellow-400/15 px-3 py-1.5 text-xs font-extrabold text-yellow-800 dark:text-yellow-300"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                  <StoreButtons
                    androidUrl={path.androidUrl}
                    iosUrl={path.iosUrl}
                    darkMode={darkMode}
                    appName={path.appName}
                    size="sm"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── SAFETY & TRUST ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-yellow-400 px-6 py-12 text-black sm:px-10 sm:py-16 lg:px-14">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[48px] border-black/[0.04]" />
            <div className="relative z-10 grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Safety by design</p>
                <h3 className="mt-4 max-w-sm text-4xl font-black leading-[0.95] tracking-[-0.045em] sm:text-5xl">
                  Confidence at every step.
                </h3>
                <p className="mt-5 max-w-sm text-sm font-medium leading-6 text-black/60 sm:text-base">
                  From the partner you choose to the payment you make, protection is part of the experience.
                </p>
              </div>

              <div className="divide-y divide-black/10 border-y border-black/10">
            {[
              {
                icon: <UserCheck size={22} />,
                title: "Verified riders and vendors",
                desc: "Every partner goes through identity and background checks before they're approved.",
              },
              {
                icon: <ShieldCheck size={22} />,
                title: "Live GPS tracking & SOS",
                desc: "Share your trip live with loved ones and reach emergency assistance with one tap.",
              },
              {
                icon: <Lock size={22} />,
                title: "Secure encrypted payments",
                desc: "All transactions are end-to-end encrypted. Your financial data stays safe.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group grid gap-4 py-6 sm:grid-cols-[auto_0.65fr_1fr] sm:items-center"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-yellow-400">
                  {item.icon}
                </div>
                <div className="text-sm font-black sm:text-base">{item.title}</div>
                <p className="text-xs font-medium leading-relaxed text-black/55 sm:text-sm">{item.desc}</p>
              </div>
            ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── DOWNLOAD CTA ──────────────────────────────────────────────── */}
        <section id="download" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#171714] px-5 py-12 text-center text-white shadow-2xl shadow-black/15 sm:px-10 sm:py-16">
            <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/15 blur-3xl" />
            <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
            <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-400">Asoose in your pocket</p>
              <h3 className="text-4xl font-black tracking-[-0.04em] md:text-6xl">
                One app. More possibilities.
              </h3>
              <p className="mx-auto max-w-xl text-base font-medium leading-7 text-white/65 md:text-lg">
                Shop, ride, send packages and manage payments with real-time updates from one place.
              </p>
            </div>

            {/* Centered store buttons — constrained width so they don't stretch full-page on desktop */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm sm:max-w-none sm:w-auto">
                <StoreButtons
                  androidUrl={CUSTOMER_ANDROID_URL}
                  iosUrl={CUSTOMER_IOS_URL}
                  darkMode={true}
                  size="lg"
                />
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto border-t border-black/5 dark:border-white/5">
          <h3 className="text-2xl sm:text-3xl font-black mb-8 sm:mb-12 text-center tracking-tight">
            Frequently asked questions
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {FAQ_DATA.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    darkMode
                      ? "bg-white/5 border-white/10"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    className="w-full flex justify-between items-center p-4 sm:p-6 text-left font-bold hover:bg-yellow-400/5 transition-colors text-sm sm:text-base"
                  >
                    <span className="pr-4">{item.q}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`flex-shrink-0 text-yellow-500 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  <div
                    id={`faq-answer-${i}`}
                    role="region"
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isOpen ? "200px" : "0px" }}
                  >
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-xs sm:text-sm opacity-60 border-t border-black/5 dark:border-white/5 pt-3 sm:pt-4 leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
