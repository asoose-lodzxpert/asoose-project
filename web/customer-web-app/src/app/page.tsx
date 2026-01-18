'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sun,
  Moon,
  Zap,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Clock,
  Wallet,
  Menu,
  X,
  Plus,
  Minus,
  UserCheck,
  Lock,
  Bell
} from 'lucide-react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

export default function AsooseLanding() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeService, setActiveService] = useState<'ride' | 'food' | 'package'>('ride');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const darkMode = resolvedTheme === 'dark';

  const RIDER_APP_URL = 'https://play.google.com/store/apps/details?id=com.asoose.rider';
  const MERCHANT_APP_URL = 'https://play.google.com/store/apps/details?id=com.asoose.vendor';

 const SERVICE_DATA = {
  food: {
    title: 'Order food or groceries',
    cta: 'Order food & groceries',
    link: '/main/store',
    badge: 'Track your order live',
  },

  ride: {
    title: 'Where to?',
    cta: 'Book a ride',
    link: '/main/ride',
    badge: 'Quick driver matching',
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




  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className={`flex-grow selection:bg-yellow-500/30 transition-colors duration-300 ${darkMode ? 'bg-[#0a0a0a] text-gray-100' : 'bg-white text-gray-900'}`}>

        {/* HERO */}
        <header className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 md:gap-12 items-center">

            {/* ACTION CARD */}
            <div className="lg:col-span-5">
              <div className={`rounded-3xl p-6 sm:p-8 border transition-all duration-500 ${
                darkMode ? 'bg-[#121212] border-white/10' : 'bg-white border-black/5'
              }`}>

                <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-6 sm:mb-8">
                  {Object.keys(SERVICE_DATA).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveService(key as any)}
                      className={`flex-1 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                        activeService === key
                          ? 'bg-white text-black dark:bg-yellow-400 dark:text-black'
                          : 'opacity-40 hover:opacity-100'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <h1 className="text-3xl sm:text-4xl font-black mb-4 sm:mb-6 tracking-tighter leading-tight">
                  {SERVICE_DATA[activeService].title}
                </h1>

                <Link
                  href={SERVICE_DATA[activeService].link}
                  className="w-full h-14 sm:h-16 flex justify-between items-center px-6 sm:px-8 rounded-2xl font-black text-base sm:text-lg bg-yellow-400 text-black hover:bg-yellow-300 transition-all active:scale-95"
                >
                  <span className="truncate">{SERVICE_DATA[activeService].cta}</span>
                  <ArrowRight size={20} className="flex-shrink-0 ml-2" />
                </Link>

                <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                  <Zap size={14} className="fill-current flex-shrink-0" />
                  <span className="leading-tight">{SERVICE_DATA[activeService].badge}</span>
                </div>
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