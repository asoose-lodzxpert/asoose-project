import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';

interface TransactionHeaderProps {
  id: string;
  status: string;
  onDownload: () => void;
  onRefund: () => void;
}

export default function TransactionHeader({ id, status, onDownload, onRefund }: TransactionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <Link href="/super-admin/transactions" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1">
          <ArrowLeft className="w-4 h-4" /> Back to Transactions
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          Transaction {id}
        </h1>
      </div>
      
      <div className="flex gap-3">
        <button 
          onClick={onDownload}
          className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors text-sm"
        >
          <Download className="w-4 h-4" /> Download Invoice
        </button>
        {status === 'Success' && (
          <button 
            onClick={onRefund}
            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white flex items-center gap-2 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Refund
          </button>
        )}
      </div>
    </div>
  );
}