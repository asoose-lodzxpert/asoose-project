'use client';

import React from 'react';
import { Download, Share2, ChevronLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Currency } from '@/app/main/components/Currency'; // ✅ Added Currency import

interface HeaderProps {
  onDownload: () => void;
  onShare: () => void;
  isDownloading: boolean;
  reference?: string; 
  status?: string;    
  amount?: React.ReactNode; // ✅ Added amount prop to interface
}

export default function TransactionHeader({ 
  onDownload, 
  onShare, 
  isDownloading,
  reference,
  status,
  amount // ✅ Added amount to destructuring
}: HeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div>
          <h1 className="text-xl font-black text-white ">
            Transaction Details
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-gray-500 font-mono uppercase">
              REF: {reference || '---'}
            </p>
            <span className="w-1 h-1 bg-gray-700 rounded-full" />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              status === 'SUCCESS' ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {status}
            </span>
            {/* ✅ Render the amount in the header if provided */}
            {amount && (
              <>
                <span className="w-1 h-1 bg-gray-700 rounded-full" />
                <div className="flex items-center">
                   {amount}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onShare}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-gray-300 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isDownloading ? 'Generating...' : 'Download Receipt'}
        </button>
      </div>
    </div>
  );
}