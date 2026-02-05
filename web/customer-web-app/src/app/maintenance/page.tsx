"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MaintenancePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/public/settings/maintenance`,
        );
        const data = await res.json();

        if (data.active === false) {
          router.push("/main/store");
        }
      } catch (error) {
        console.error("Checking maintenance status failed", error);
      }
    };

    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    setIsChecking(true);
    router.refresh();
    setTimeout(() => setIsChecking(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white selection:bg-yellow-500/30">
      <main className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Status Indicator */}
        <div className="flex justify-center items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            System Update
          </span>
        </div>

        {/* Core Message */}
        <div className="space-y-4">
          {/* <h1 className="text-5xl font-black tracking-tighter italic">
            ASOOS<span className="text-yellow-500">EE</span>
          </h1> */}
          <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
            We&apos;re currently refining the platform. You will be redirected
            automatically once we are live.
          </p>
        </div>

        {/* Minimal Actions */}
        <div className="flex flex-col items-center gap-6 pt-4">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors group"
          >
            <RefreshCw
              size={14}
              className={
                isChecking
                  ? "animate-spin"
                  : "group-hover:rotate-180 transition-transform duration-500"
              }
            />
            Check Status
          </button>

          <div className="h-px w-12 bg-zinc-900" />

          <Link
            href="/super-admin/dashboard"
            className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-yellow-500 transition-colors"
          >
            Admin Access
          </Link>
        </div>
      </main>

      {/* Subtle background element */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
    </div>
  );
}
