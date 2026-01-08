import React from 'react'; // Add if needed
import Link from 'next/link';
import { ArrowLeft, Download, Share2, Loader2 } from 'lucide-react';

interface HeaderProps {
  onDownload: () => void;
  onShare: () => void;
  isDownloading: boolean;
}

const TransactionHeader = ({ onDownload, onShare, isDownloading }: HeaderProps) => (
  <div className="flex items-center justify-between">
    <div>
      <Link 
        href="/super-admin/transactions" 
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 text-sm transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
        Back to Transactions
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold text-white">Transaction Details</h1>
    </div>
    <div className="flex gap-3">
      <button 
        onClick={onDownload}
        disabled={isDownloading}
        aria-label={isDownloading ? "Downloading receipt" : "Download receipt"}
        className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Download Receipt
      </button>
      <button 
        onClick={onShare}
        aria-label="Share transaction"
        className="px-5 py-2.5 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
      >
        <Share2 className="w-4 h-4" /> Share
      </button>
    </div>
  </div>
);

export default TransactionHeader;