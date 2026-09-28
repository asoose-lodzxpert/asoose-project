"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useCityStore } from "@/store/useCityStore";

export function JosLaunchNotice() {
  const cityName = useCityStore((state) => state.selectedCity?.name);
  const [dismissed, setDismissed] = useState(false);
  const open = cityName?.trim().toLowerCase() === "jos" && !dismissed;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="jos-launch-title" aria-describedby="jos-launch-description">
      <div className="relative flex w-full flex-col items-center justify-center rounded-3xl border border-yellow-400/30 bg-white px-6 py-12 text-center shadow-2xl dark:bg-[#151515] sm:min-h-[33vh] sm:w-2/3 sm:px-12">
        <button type="button" onClick={() => setDismissed(true)} aria-label="Close Jos announcement" className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-600 dark:text-yellow-400">Coming soon</p>
        <h2 id="jos-launch-title" className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">Jos, we’re almost ready</h2>
        <p id="jos-launch-description" className="mt-4 max-w-lg text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">We’ll be fully operational in Jos by October 26.</p>
        <button type="button" onClick={() => setDismissed(true)} className="mt-8 rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black transition hover:bg-yellow-300">Got it</button>
      </div>
    </div>
  );
}
