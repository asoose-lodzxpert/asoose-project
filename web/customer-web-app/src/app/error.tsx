"use client";

import { useEffect } from "react";
import { RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 select-none transition-colors duration-300">
      {/* Friendly Icon / Visual */}
      <div className="mb-6 relative">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center animate-pulse">
          <span className="text-3xl">😕</span>
        </div>
      </div>

      {/* Primary Message */}
      <div className="text-center space-y-3 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Something went wrong
        </h1>
        <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">
          We encountered an issue while loading this page. It might be a
          temporary glitch.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all active:scale-95"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/main/store"
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Optional: Error Code for Support (Subtle) */}
      {error.digest && (
        <p className="mt-12 text-[10px] text-gray-400 uppercase tracking-widest opacity-50">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
