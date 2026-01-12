'use client';

import React, { useEffect, useState } from 'react';
import { Hammer, Timer, Mail, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MaintenancePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/settings/maintenance`);
        const data = await res.json();

        if (data.active === false) {
          router.push('/main/store');
        }
      } catch (error) {
        console.error("Checking maintenance status failed", error);
      }
    };

    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    setIsChecking(true);
    router.refresh();
    // Small delay to show the spinner effect
    setTimeout(() => setIsChecking(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans selection:bg-yellow-500/30">
      <div className="max-w-2xl w-full text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Visual Brand/Icon */}
        <div className="relative flex justify-center">
          <div className="absolute inset-0 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-2xl">
            <Hammer size={48} className="text-yellow-500 animate-bounce" />
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            We&apos;re polishing <span className="text-yellow-500">Asoosee</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto font-medium leading-relaxed">
            Our platform is currently undergoing scheduled maintenance. We will automatically return you to the store once we are back online.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={handleManualRefresh}
            className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-yellow-500 transition-all active:scale-95 group"
          >
            <RefreshCw size={18} className={`group-hover:rotate-180 transition-transform duration-500 ${isChecking ? 'animate-spin' : ''}`} />
            Check Now
          </button>
          
          <Link 
            href="/main/store"
            className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-800 px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
          >
            Try Returning Home
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
          <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-yellow-500">
              <Timer size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
            </div>
            <p className="text-white font-bold">In Progress</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Mail size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Support</span>
            </div>
            <p className="text-white font-bold truncate">support@asoosee.com</p>
          </div>
        </div>

        {/* Admin Access Indicator */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
            <ShieldAlert size={14} className="text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Administrator? <Link href="/super-admin/dashboard" className="text-yellow-500 hover:underline ml-1">Log in here</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}