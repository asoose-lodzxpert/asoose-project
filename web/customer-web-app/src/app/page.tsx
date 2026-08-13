"use client"
import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  MapPin,
  Clock,
  Wallet,
  UserCheck,
  Lock,
  ChevronDown,
  Star,
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

  const SERVICE_KEYS = ["food", "ride", "package"] as const;

  const SERVICE_DATA = {
    food: {
      title: "Local Marketplace",
      desc: "Explore thousands of items from nearby stores. Groceries, meals, pharmacy, and retail delivered fast",
      cta: "Make order",
      link: "/main/store",
      badge: "Track your order live",
      image: "/marketplace.webp",
    },
    ride: {
      title: "Where to?",
      desc: "Get to your destination quickly and safely. Reliable rides with verified drivers and upfront pricing.",
      cta: "Book a ride",
      link: "/main/ride",
      badge: "Quick driver matching",
      image: "/ride.webp",
    },
    package: {
      title: "Send a package",
      desc: "Secure delivery for your parcels. From documents to bulk items, we ensure it gets there safely.",
      cta: "Send a package",
      link: "/main/delivery",
      badge: "Upfront pricing & secure",
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
        {/* ── HERO CAROUSEL ─────────────────────────────────────────────── */}
        <header className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
          <div
            className={`relative w-full rounded-[2.5rem] overflow-hidden border transition-all duration-500 min-h-[500px] flex ${
              darkMode
                ? "bg-[#121212] border-white/10"
                : "bg-white border-black/5"
            }`}
            onMouseEnter={() => setIsPaused(true)}
          >
            {/* Slides */}
            <div
              className="flex transition-transform duration-700 ease-in-out w-full"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {SERVICE_KEYS.map((key, index) => (
                <div
                  key={key}
                  className="w-full flex-shrink-0 grid md:grid-cols-2 gap-8 md:gap-12 items-center px-6 py-12 sm:px-12 md:px-16"
                >
                  {/* LEFT: Content */}
                  <div className="flex flex-col items-start text-left z-10 order-1">
                    {/* Badge */}
                    <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-black uppercase tracking-widest">
                      {SERVICE_DATA[key].badge}
                    </div>

                    {/* Headline */}
                    <h1
                      className="font-black tracking-tighter leading-[1.1] mb-4"
                      style={{ fontSize: "clamp(2.25rem, 6vw, 4.5rem)" }}
                    >
                      {SERVICE_DATA[key].title}
                    </h1>

                    {/* Description */}
                    <p className="text-base sm:text-lg font-medium opacity-70 max-w-xl mb-8 leading-relaxed">
                      {SERVICE_DATA[key].desc}
                    </p>

                    {/* ── Primary CTA ── */}
                    <Link
                      href={SERVICE_DATA[key].link}
                      className="inline-flex items-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-yellow-400 text-black font-black text-lg hover:bg-yellow-300 transition-all active:scale-95 hover:scale-105 mb-4"
                    >
                      {SERVICE_DATA[key].cta}
                      <ArrowRight size={22} />
                    </Link>

                    {/* ── Store Buttons — on their own row, always visible ── */}
                    <StoreButtons
                      androidUrl={CUSTOMER_ANDROID_URL}
                      iosUrl={CUSTOMER_IOS_URL}
                      darkMode={darkMode}
                      size="sm"
                    />
                  </div>

                  {/* RIGHT: Image */}
                  <div className="relative w-full h-[260px] md:h-[450px] rounded-3xl overflow-hidden order-2 bg-zinc-100 dark:bg-zinc-900">
                    <Image
                      src={SERVICE_DATA[key].image}
                      alt={SERVICE_DATA[key].title}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-700"
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={index === 0 ? 90 : 85}
                      placeholder="blur"
                      blurDataURL={BLUR_MAP[SERVICE_DATA[key].image]}
                    />
                    <div className="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination dots */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-20">
              {SERVICE_KEYS.map((key, i) => (
                <button
                  key={key}
                  onClick={() => setActiveService(key)}
                  aria-label={`Go to ${key} slide`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-8 bg-yellow-400"
                      : "w-2 bg-gray-300 dark:bg-white/20 hover:bg-yellow-400/50"
                  }`}
                />
              ))}
            </div>

            {/* Progress bar */}
            {!isPaused && (
              <div className="absolute bottom-0 left-0 h-1 bg-yellow-400/20 w-full z-20">
                <div
                  key={activeService}
                  className="h-full bg-yellow-400 w-full origin-left animate-[progress_5s_linear_forwards]"
                />
              </div>
            )}
          </div>
        </header>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-black/5 dark:border-white/5">
          <h3 className="text-2xl sm:text-3xl font-black mb-12 sm:mb-16 text-center tracking-tight">
            How it works
          </h3>

          <div className="flex flex-col sm:flex-row relative">
            <div className="hidden sm:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-yellow-400/30" />

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
                className="group flex sm:flex-col items-start sm:items-center gap-4 sm:gap-0 sm:flex-1 sm:text-center px-0 sm:px-6 py-6 sm:py-0"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 relative z-10 ${
                      darkMode
                        ? "bg-[#1e1e1e] border border-white/10"
                        : "bg-white border border-black/8 shadow-sm"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center z-20">
                    {i + 1}
                  </span>
                </div>
                <div className="sm:mt-5">
                  <h4 className="font-bold text-base sm:text-lg mb-1">{step.title}</h4>
                  <p className="opacity-60 text-sm leading-relaxed max-w-[200px] sm:mx-auto">
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
        <section className="py-24 px-6 border-t border-black/5 dark:border-white/5">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter">
                Get the app
              </h3>
              <p className="text-lg md:text-xl opacity-60 font-medium max-w-lg mx-auto leading-relaxed">
                Experience the full Asoose ecosystem. Real-time tracking,
                exclusive offers, and seamless payments.
              </p>
            </div>

            {/* Centered store buttons — constrained width so they don't stretch full-page on desktop */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm sm:max-w-none sm:w-auto">
                <StoreButtons
                  androidUrl={CUSTOMER_ANDROID_URL}
                  iosUrl={CUSTOMER_IOS_URL}
                  darkMode={darkMode}
                  size="lg"
                />
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
