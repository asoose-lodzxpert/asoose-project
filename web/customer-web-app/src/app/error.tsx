'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  
  useEffect(() => {
    // Log the error to an error reporting service (e.g. Sentry)
    console.error('Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-center p-4">
      
      {/* Icon with Red Glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full"></div>
        <div className="relative bg-[#1E293B] p-6 rounded-2xl border border-red-500/30 shadow-xl">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
      </div>

      <h1 className="text-3xl font-black text-white mb-2">Something went wrong!</h1>
      
      <p className="text-gray-400 max-w-md mb-6 text-sm">
        We encountered an unexpected error. Our team has been notified.
        <br />
        <span className="font-mono text-xs bg-black/30 px-2 py-1 rounded mt-2 inline-block text-red-400">
           Error: {error.message || 'Unknown Error'}
        </span>
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all shadow-lg"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>

        <Link 
          href="/super-admin/dashboard" 
          className="flex items-center gap-2 px-6 py-3 bg-[#1E293B] hover:bg-[#334155] text-white font-bold rounded-xl border border-gray-700 transition-all"
        >
          <Home className="w-4 h-4" /> Return Home
        </Link>
      </div>

    </div>
  );
}