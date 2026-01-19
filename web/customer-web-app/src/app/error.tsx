'use client';

import { useEffect } from 'react';
import { RefreshCcw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 select-none">
      {/* Visual Indicator */}
      <div className="mb-6">
        <div className="w-1 h-12 bg-red-500 animate-pulse" />
      </div>

      {/* Primary Message */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-xl font-bold text-white uppercase tracking-[0.3em]">
          System Failure
        </h1>
        <p className="text-zinc-500 text-sm font-medium max-w-xs mx-auto">
          An unexpected exception has occurred within the application core.
        </p>
      </div>

      {/* Technical Metadata - Minimalist Error Display */}
      <div className="mb-12">
        <code className="text-[10px] font-mono uppercase tracking-widest text-red-500/60 bg-red-500/5 px-3 py-1 rounded-full border border-red-500/10">
          {error.digest || 'ERR_INTERNAL_CORE'}
        </code>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={() => reset()}
          className="group flex items-center gap-3 text-white hover:text-red-500 transition-colors duration-300"
        >
          <RefreshCcw className="w-4 h-4 transition-transform group-active:rotate-180" />
          <span className="text-xs font-black uppercase tracking-widest">Execute Recovery</span>
        </button>

        <Link 
          href="/super-admin/dashboard" 
          className="group flex items-center gap-3 text-zinc-500 hover:text-white transition-colors duration-300"
        >
          <span className="text-xs font-black uppercase tracking-widest">Abort to Dashboard</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}