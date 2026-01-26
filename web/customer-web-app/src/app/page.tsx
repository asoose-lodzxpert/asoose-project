'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Zap,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Clock,
  Wallet,
  UserCheck,
  Lock,
  Minus,
  Plus
} from 'lucide-react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

export default function AsooseLanding() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Carousel State
  const [activeService, setActiveService] = useState<'ride' | 'food' | 'package'>('ride');
  const [isPaused, setIsPaused] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const darkMode = resolvedTheme === 'dark';

  // App Store Links
  const CUSTOMER_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.asoose.customer';
  const CUSTOMER_IOS_URL = '#'; 
  const RIDER_APP_URL = 'https://play.google.com/store/apps/details?id=com.asoose.rider';
  const MERCHANT_APP_URL = 'https://play.google.com/store/apps/details?id=com.asoose.vendor';

  const SERVICE_KEYS = ['ride', 'food', 'package'] as const;

  const SERVICE_DATA = {
    ride: {
      title: 'Where to?',
      cta: 'Book a ride',
      link: '/main/ride',
      badge: 'Quick driver matching',
    },
    food: {
      title: 'Order food or groceries',
      cta: 'Order food & groceries',
      link: '/main/store',
      badge: 'Track your order live',
    },
    package: {
      title: 'Send a package',
      cta: 'Send a package',
      link: '/main/delivery',
      badge: 'Upfront pricing & secure delivery',
    },
  };

  const FAQ_DATA = [
    {
      q: "How are prices calculated?",
      a: "Prices are calculated based on distance, time, and service type. You'll always see the total upfront — no surprises."
    },
    {
      q: "How do I pay?",
      a: "Pay safely using your wallet, bank card, or bank transfer. Transactions are fully encrypted for your security."
    },
    {
      q: "What if there's an issue?",
      a: "Our 24/7 support team is ready in the app to help with any issues — from trip problems to delivery questions."
    },
    {
      q: "Is it safe?",
      a: "All riders are verified, trips are GPS-tracked, and emergency assistance is available at all times for your peace of mind."
    },
    {
      q: "Can I cancel a ride or delivery?",
      a: "Yes — you can cancel anytime. Fees (if any) are shown before confirmation."
    },
    {
      q: "How do I track my order or package?",
      a: "Track your ride or delivery live on the map, right in the app."
    }
  ];

  // Carousel Logic
  const handleNext = useCallback(() => {
    setActiveService((current) => {
      const currentIndex = SERVICE_KEYS.indexOf(current);
      const nextIndex = (currentIndex + 1) % SERVICE_KEYS.length;
      return SERVICE_KEYS[nextIndex];
    });
  }, []);

  useEffect(() => {
    if (!mounted || isPaused) return;
    const interval = setInterval(handleNext, 4000); // Switch every 4 seconds
    return () => clearInterval(interval);
  }, [mounted, isPaused, handleNext]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className={`flex-grow selection:bg-yellow-500/30 transition-colors duration-300 ${darkMode ? 'bg-[#0a0a0a] text-gray-100' : 'bg-white text-gray-900'}`}>

        {/* HERO */}
        <header className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 md:gap-12 items-center">

            {/* ACTION CARD CAROUSEL */}
            <div className="lg:col-span-5">
              <div 
                className={`rounded-3xl p-6 sm:p-8 border transition-all duration-500 relative overflow-hidden ${
                  darkMode ? 'bg-[#121212] border-white/10' : 'bg-white border-black/5'
                }`}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {/* Progress Indicators / Tabs */}
                <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-6 sm:mb-8 z-10 relative">
                  {SERVICE_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveService(key);
                        setIsPaused(true); // Pause if user manually clicks
                      }}
                      className={`flex-1 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                        activeService === key
                          ? 'bg-white text-black dark:bg-yellow-400 dark:text-black shadow-sm scale-100'
                          : 'opacity-40 hover:opacity-100 scale-95'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {/* Animated Content */}
                <div key={activeService} className="animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-forwards">
                    <h1 className="text-3xl sm:text-4xl font-black mb-4 sm:mb-6 tracking-tighter leading-tight min-h-[80px] flex items-center">
                      {SERVICE_DATA[activeService].title}
                    </h1>

                    <Link
                      href={SERVICE_DATA[activeService].link}
                      className="w-full h-14 sm:h-16 flex justify-between items-center px-6 sm:px-8 rounded-2xl font-black text-base sm:text-lg bg-yellow-400 text-black hover:bg-yellow-300 transition-all active:scale-95 group"
                    >
                      <span className="truncate">{SERVICE_DATA[activeService].cta}</span>
                      <ArrowRight size={20} className="flex-shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                      <Zap size={14} className="fill-current flex-shrink-0 animate-pulse" />
                      <span className="leading-tight">{SERVICE_DATA[activeService].badge}</span>
                    </div>
                </div>

                {/* Progress Bar (Optional Visual Flair) */}
                {!isPaused && (
                  <div className="absolute bottom-0 left-0 h-1 bg-yellow-400/20 w-full">
                     <div className="h-full bg-yellow-400 w-full origin-left animate-[progress_4s_linear_infinite]" />
                  </div>
                )}
              </div>
            </div>

            {/* COPY */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
                Rides, food, groceries and essentials deliveries on demand
              </h2>
              <p className="text-lg sm:text-xl max-w-xl mx-auto lg:mx-0 opacity-80 font-medium">
                One app to move people, goods, and meals.
                Prices upfront. Real-time tracking. No guessing.
              </p>
            </div>
          </div>
        </header>

        {/* HOW IT WORKS */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-black/5 dark:border-white/5">
          <h3 className="text-2xl sm:text-3xl font-black mb-12 sm:mb-16 text-center tracking-tight">How it works</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12 text-center">
            {[
              { icon: <MapPin className="text-yellow-500" />, title: "Choose a service", desc: "Ride, food, groceries, or delivery." },
              { icon: <Wallet className="text-yellow-500" />, title: "Confirm price", desc: "See cost before you commit." },
              { icon: <Clock className="text-yellow-500" />, title: "Track live", desc: "Follow progress in real time." }
            ].map((step, i) => (
              <div key={i} className="group flex flex-col items-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 transition-transform group-hover:scale-110 ${darkMode ? 'bg-white/5' : 'bg-white'}`}>
                  {step.icon}
                </div>
                <h4 className="font-bold text-lg sm:text-xl mb-2">{step.title}</h4>
                <p className="opacity-60 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MERCHANT SECTION */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center border-t border-black/5 dark:border-white/5">
          <div className="order-2 md:order-1 space-y-6 sm:space-y-8">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Grow your business.<br/>Become a partner.</h3>
            <p className="opacity-70 text-base sm:text-lg leading-relaxed">
              Sell food, groceries, or goods. We handle payments and delivery so you can focus on quality.
            </p>
            <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" /> Reach more customers</li>
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" /> Manage orders in real time</li>
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" /> Reliable delivery network</li>
            </ul>
            <a href={MERCHANT_APP_URL} className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-xs sm:text-sm text-yellow-500 hover:text-yellow-400 transition-colors">
              Download Vendors App <ChevronRight size={18} className="flex-shrink-0" />
            </a>
          </div>
          <div className="order-1 md:order-2 relative h-[300px] sm:h-[400px] md:h-[450px] rounded-3xl overflow-hidden">
            <Image src="/store.svg" alt="Become a merchant" fill className="object-cover" />
          </div>
        </section>

        {/* RIDER SECTION */}
        <section className={`py-16 sm:py-20 md:py-24 px-4 sm:px-6 border-t ${darkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-black/5'}`}>
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
            <div className="relative h-[300px] sm:h-[400px] md:h-[450px] rounded-3xl overflow-hidden">
              <Image src="/rider.svg" alt="Become a rider" fill className="object-cover" />
            </div>
            <div className="space-y-6 sm:space-y-8">
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Be the boss.<br/>Drive with Asoose.</h3>
              <p className="opacity-70 text-base sm:text-lg leading-relaxed">
                Earn on your schedule by helping people move and deliver across the city. Deliver meals, groceries, or provide rides.
              </p>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm font-bold uppercase tracking-wider">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" /> Flexible working hours</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" /> Transparent earnings</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" /> In-app navigation & support</li>
              </ul>
              <a href={RIDER_APP_URL} className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-xs sm:text-sm text-yellow-500 hover:text-yellow-400 transition-colors">
                Download Rider App <ChevronRight size={18} className="flex-shrink-0" />
              </a>
            </div>
          </div>
        </section>

        {/* SAFETY & TRUST */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-black/5 dark:border-white/5">
          <h3 className="text-2xl sm:text-3xl font-black mb-12 sm:mb-16 text-center tracking-tight">Your safety drives us</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-10 sm:gap-12 text-center">
            {[
              { icon: <UserCheck className="mx-auto mb-4 text-yellow-500" />, text: "Verified riders and vendors" },
              { icon: <ShieldCheck className="mx-auto mb-4 text-yellow-500" />, text: "Live GPS tracking & SOS" },
              { icon: <Lock className="mx-auto mb-4 text-yellow-500" />, text: "Secure encrypted payments" }
            ].map((item, i) => (
              <div key={i} className="group">
                {item.icon}
                <div className="font-bold text-xs sm:text-sm uppercase tracking-widest group-hover:text-yellow-500 transition-colors">{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* MINIMALIST DOWNLOAD APP SECTION */}
        <section className="py-24 px-6 border-t border-black/5 dark:border-white/5">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <div className="space-y-4">
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter">
                Get the app
              </h3>
              <p className="text-lg md:text-xl opacity-60 font-medium max-w-lg mx-auto leading-relaxed">
                Experience the full Asoose ecosystem. Real-time tracking, exclusive offers, and seamless payments.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              {/* Apple Button */}
              <a 
                href={CUSTOMER_IOS_URL} 
                className={`group flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all border-2 ${darkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.14-2.53-2.14-3.5-3.09-8.48 2-10.92 1.34-.65 2.62-.2 3.65-.2 1.27 0 2.21.72 2.87.72.65 0 2.05-.88 3.49-.75 2.49.19 3.98 1.5 4.38 1.87-.03.05-2.62 1.52-2.58 4.63.02 3.09 2.72 4.17 2.92 4.23-.05.19-.42 1.44-1.38 2.85M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.32.74-2.99 1.53-.61.72-1.15 1.86-1.01 2.98 1.17.09 2.33-.71 2.93-1.4z"/></svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold tracking-wider opacity-70 leading-none mb-0.5">Download on the</div>
                  <div className="text-sm font-bold leading-none">App Store</div>
                </div>
              </a>

              {/* Android Button */}
              <a 
                href={CUSTOMER_ANDROID_URL} 
                className={`group flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all border-2 ${darkMode ? 'border-white/20 hover:border-white hover:bg-white/5' : 'border-black/10 hover:border-black hover:bg-black/5'}`}
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold tracking-wider opacity-70 leading-none mb-0.5">Get it on</div>
                  <div className="text-sm font-bold leading-none">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto border-t border-black/5 dark:border-white/5">
          <h3 className="text-2xl sm:text-3xl font-black mb-8 sm:mb-12 text-center tracking-tight">Frequently asked questions</h3>
          <div className="space-y-3 sm:space-y-4">
            {FAQ_DATA.map((item, i) => (
              <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-4 sm:p-6 text-left font-bold hover:bg-yellow-400/5 transition-colors text-sm sm:text-base"
                >
                  <span className="pr-4">{item.q}</span>
                  {openFaq === i ? <Minus size={18} className="text-yellow-500 flex-shrink-0" /> : <Plus size={18} className="flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-xs sm:text-sm opacity-60 border-t border-black/5 dark:border-white/5 pt-3 sm:pt-4 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      
      </main>
      
      <Footer />
    </div>
  );
}