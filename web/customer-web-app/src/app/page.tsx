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
      image: "/marketplace.webp",
    },
    ride: {
      eyebrow: "Reliable rides, when you need them",
      title: "Move with confidence.",
      desc: "Request a safe, dependable ride with verified drivers, clear pricing and live trip tracking.",
      cta: "Book a ride",
      link: "/main/ride",
      icon: CarFront,
      image: "/ride.webp",
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

  const activeIndex = SERVICE_KEYS.indexOf(activeService);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main
        className={`flex-grow selection:bg-yellow-500/30 transition-colors duration-300 ${
          darkMode ? "bg-[#0a0a0a] text-gray-100" : "bg-white text-gray-900"
        }`}
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <header className="mx-auto max-w-7xl px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:pt-32">
          <div
            className={`relative overflow-hidden rounded-[2rem] border transition-all duration-500 sm:rounded-[2.5rem] ${
              darkMode
                ? "border-white/10 bg-[#11110f]"
                : "border-black/[0.06] bg-[#f8f7f2]"
            }`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" />

            <div className="relative z-20 flex gap-2 overflow-x-auto px-5 pt-5 scrollbar-hide sm:px-8 sm:pt-8 lg:px-12">
              {SERVICE_KEYS.map((key) => {
                const Icon = SERVICE_DATA[key].icon;
                const active = activeService === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveService(key)}
                    aria-pressed={active}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition sm:text-sm ${
                      active
                        ? "bg-[#171714] text-white shadow-lg dark:bg-yellow-400 dark:text-black"
                        : "border border-black/[0.06] bg-white/70 text-gray-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {key === "food" ? "Marketplace" : key === "ride" ? "Rides" : "Delivery"}
                  </button>
                );
              })}
            </div>

            <div
              className="flex w-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {SERVICE_KEYS.map((key, index) => (
                <div
                  key={key}
                  className="grid w-full flex-shrink-0 items-center gap-8 px-5 pb-10 pt-8 sm:px-8 sm:pb-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12 lg:px-12 lg:pb-14 lg:pt-10"
                >
                  <div className="relative z-10 order-2 flex flex-col items-start text-left md:order-1">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-700 dark:text-yellow-400 sm:text-xs">
                      {SERVICE_DATA[key].eyebrow}
                    </p>
                    <h1 className="mb-5 max-w-xl text-[2.65rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                      {SERVICE_DATA[key].title}
                    </h1>
                    <p className="mb-7 max-w-lg text-base font-medium leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">
                      {SERVICE_DATA[key].desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={SERVICE_DATA[key].link}
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/15 transition hover:bg-yellow-300 active:scale-[0.98] sm:px-7 sm:py-4"
                      >
                        {SERVICE_DATA[key].cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/about"
                        className="rounded-xl px-5 py-3.5 text-sm font-extrabold text-gray-600 transition hover:bg-black/5 hover:text-black dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                      >
                        Learn about Asoose
                      </Link>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-yellow-600" /> Verified partners</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-yellow-600" /> Live tracking</span>
                      <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-yellow-600" /> Secure payments</span>
                    </div>
                  </div>

                  <div className="relative order-1 h-[260px] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100 shadow-2xl shadow-black/10 sm:h-[360px] md:order-2 md:h-[470px] md:rounded-[2rem] dark:bg-zinc-900">
                    <Image
                      src={SERVICE_DATA[key].image}
                      alt={SERVICE_DATA[key].title}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={index === 0 ? 90 : 85}
                      placeholder="blur"
                      blurDataURL={BLUR_MAP[SERVICE_DATA[key].image]}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/20 bg-black/45 px-4 py-3 text-white backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-5">
                      <div><p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Available in your city</p><p className="mt-0.5 text-sm font-black">Fast. Local. Dependable.</p></div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-black"><ArrowRight className="h-4 w-4" /></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!isPaused && (
              <div className="absolute bottom-0 left-0 z-20 h-0.5 w-full bg-yellow-400/15">
                <div
                  key={activeService}
                  className="h-full w-full origin-left animate-[progress_5s_linear_forwards] bg-yellow-400"
                />
              </div>
            )}
          </div>
        </header>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 text-center sm:mb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-600">Simple from start to finish</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">How Asoose works</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500 sm:text-base">Whatever you need around the city, the experience stays clear and predictable.</p>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3">

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
                className={`group flex items-start gap-4 rounded-3xl border p-5 sm:flex-col sm:p-6 ${darkMode ? "border-white/[0.07] bg-white/[0.03]" : "border-black/[0.05] bg-[#fafaf8]"}`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:-translate-y-0.5 ${
                      darkMode
                        ? "bg-yellow-400/10"
                        : "bg-yellow-100"
                    }`}
                  >
                    {step.icon}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step {i + 1}</span>
                  <h3 className="mt-1 text-base font-black sm:text-lg">{step.title}</h3>
                  <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-gray-500">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── MERCHANT SECTION ──────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center border-t border-black/5 dark:border-white/5">
          <div className="order-2 md:order-1 space-y-6 sm:space-y-8">
            <span className="inline-block text-[10px] uppercase tracking-widest font-bold opacity-40 border border-current rounded-full px-3 py-1">
              For Merchants
            </span>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight">
              Grow your business.
              <br />
              Become a partner.
            </h3>
            <p className="opacity-70 text-base sm:text-lg leading-relaxed">
              Sell food, groceries, or goods. We handle payments and delivery so
              you can focus on quality.
            </p>
            <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm font-bold uppercase tracking-wider">
              {["Reach more customers", "Manage orders in real time", "Reliable delivery network"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <StoreButtons
              androidUrl={MERCHANT_ANDROID_URL}
              iosUrl={MERCHANT_IOS_URL}
              darkMode={darkMode}
              appName="merchant"
              size="sm"
            />
          </div>
          <div className="order-1 md:order-2 relative h-[300px] sm:h-[400px] md:h-[450px] rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            <Image
              src="/vendor.webp"
              alt="Become a merchant"
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
              quality={85}
              placeholder="blur"
              blurDataURL={BLUR_MAP["/vendor.webp"]}
            />
          </div>
        </section>

        {/* ── RIDER SECTION ─────────────────────────────────────────────── */}
        <section
          className={`py-16 sm:py-20 md:py-24 px-4 sm:px-6 border-t ${
            darkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-black/5"
          }`}
        >
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
            <div className="relative h-[300px] sm:h-[400px] md:h-[450px] rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              <Image
                src="/driver.webp"
                alt="Become a rider"
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={85}
                placeholder="blur"
                blurDataURL={BLUR_MAP["/driver.webp"]}
              />
            </div>
            <div className="space-y-6 sm:space-y-8">
              <span className="inline-block text-[10px] uppercase tracking-widest font-bold opacity-40 border border-current rounded-full px-3 py-1">
                For Riders
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight">
                Be the boss.
                <br />
                Drive with Asoose.
              </h3>
              <p className="opacity-70 text-base sm:text-lg leading-relaxed">
                Earn on your schedule by helping people move and deliver across
                the city. Deliver meals, groceries, or provide rides.
              </p>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm font-bold uppercase tracking-wider">
                {["Flexible working hours", "Transparent earnings", "In-app navigation & support"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <StoreButtons
                androidUrl={RIDER_ANDROID_URL}
                iosUrl={RIDER_IOS_URL}
                darkMode={darkMode}
                appName="rider"
                size="sm"
              />
            </div>
          </div>
        </section>

        {/* ── SAFETY & TRUST ────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-black/5 dark:border-white/5">
          <h3 className="text-2xl sm:text-3xl font-black mb-12 sm:mb-16 text-center tracking-tight">
            Your safety drives us
          </h3>

          <div className="flex flex-col sm:flex-row gap-4">
            {[
              {
                icon: <UserCheck size={22} className="text-yellow-500" />,
                title: "Verified riders and vendors",
                desc: "Every partner goes through identity and background checks before they're approved.",
              },
              {
                icon: <ShieldCheck size={22} className="text-yellow-500" />,
                title: "Live GPS tracking & SOS",
                desc: "Share your trip live with loved ones and reach emergency assistance with one tap.",
              },
              {
                icon: <Lock size={22} className="text-yellow-500" />,
                title: "Secure encrypted payments",
                desc: "All transactions are end-to-end encrypted. Your financial data stays safe.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`group flex flex-row sm:flex-col gap-4 sm:gap-3 flex-1 p-5 sm:p-6 rounded-2xl border transition-colors ${
                  darkMode
                    ? "bg-white/[0.03] border-white/8 hover:bg-white/[0.06]"
                    : "bg-black/[0.02] border-black/5 hover:bg-black/[0.04]"
                }`}
              >
                <div
                  className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${
                    darkMode ? "bg-yellow-500/10" : "bg-yellow-50"
                  }`}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base mb-1 group-hover:text-yellow-500 transition-colors">
                    {item.title}
                  </div>
                  <p className="text-xs opacity-55 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DOWNLOAD CTA ──────────────────────────────────────────────── */}
        <section className="px-4 py-16 sm:px-6 sm:py-20">
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
