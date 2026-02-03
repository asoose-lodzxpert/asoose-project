import React from 'react';
import { Download, Share2, ShieldCheck, Loader2 } from 'lucide-react'; // ✅ Import ShieldCheck, Loader2

interface Props {
  onDownload: () => void;
  onShare: () => void;
  isDownloading: boolean;
  reference?: string;
  status: string;
  amount: React.ReactNode;
  
  // ✅ New Props for Feature 3
  onVerify?: () => void;
  isVerifying?: boolean;
  canVerify?: boolean;
}

export default function TransactionHeader({ 
  onDownload, onShare, isDownloading, reference, status, amount,
  onVerify, isVerifying, canVerify 
}: Props) {
  
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
         <h1 className="text-2xl font-bold text-white mb-1">Transaction Details</h1>
         <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 font-mono">#{reference || 'N/A'}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                status === 'COMPLETED' || status === 'SUCCESS' ? 'bg-green-500/10 text-green-500' :
                status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                'bg-yellow-500/10 text-yellow-500'
            }`}>
                {status}
            </span>
         </div>
      </div>

      <div className="flex gap-2">
         {/* ✅ FEATURE 3: Re-Verify Button */}
         {canVerify && onVerify && (
            <button 
              onClick={onVerify}
              disabled={isVerifying}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
               {isVerifying ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4" />}
               Re-Verify
            </button>
         )}

         <button onClick={onShare} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg border border-gray-700">
            <Share2 className="w-5 h-5" />
         </button>
         <button onClick={onDownload} disabled={isDownloading} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700 font-medium text-sm">
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Receipt
         </button>
      </div>
    </div>
  );
}