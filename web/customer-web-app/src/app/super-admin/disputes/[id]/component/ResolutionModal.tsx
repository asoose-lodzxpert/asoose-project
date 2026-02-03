'use client';
import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { ModalType } from '../types';

interface Props {
  isOpen: boolean;
  type: ModalType;
  maxRefundAmount: number;
  isProcessing: boolean;
  onClose: () => void;
  // ✅ FIX: Updated signature to accept optional amount
  onConfirm: (notes: string, refundSource: string, amount?: string) => void; 
}

export default function ResolutionModal({ isOpen, type, maxRefundAmount, isProcessing, onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState(''); // ✅ FIX: State for partial amount
  const [refundSource, setRefundSource] = useState('PLATFORM');

  if (!isOpen) return null;

  const isRefund = type === 'REFUND_FULL' || type === 'REFUND_PARTIAL';
  const isPartial = type === 'REFUND_PARTIAL';
  const isReject = type === 'REJECT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1E293B] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {isReject ? <AlertTriangle className="text-red-500" /> : <CheckCircle className="text-green-500" />}
            {isReject ? 'Reject Dispute' : isRefund ? 'Issue Refund' : 'Resolve Dispute'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
           {/* Refund Source Selector */}
           {isRefund && (
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Refund Source</label>
              <select 
                value={refundSource}
                onChange={(e) => setRefundSource(e.target.value)}
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="PLATFORM">Platform Treasury</option>
                <option value="VENDOR_WALLET">Vendor Wallet (Order Only)</option>
              </select>
            </div>
           )}

           {/* ✅ FIX: Amount Input for Partial Refunds */}
           {isPartial && (
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                Partial Refund Amount (Max: {maxRefundAmount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
           )}

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
              {isReject ? 'Rejection Reason' : 'Resolution Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 h-32 resize-none"
              placeholder={isReject ? "Explain why this is being rejected..." : "Describe the resolution details..."}
            />
          </div>

          {isRefund && !isPartial && (
             <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-400">
                Max Refund: <strong>{maxRefundAmount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</strong>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-transparent border border-gray-600 rounded-xl text-gray-300 font-bold hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
          
          <button 
            // ✅ FIX: Pass 'amount' to the confirm handler
            onClick={() => onConfirm(notes, refundSource, amount)}
            
            // ✅ FIX: Disable if partial refund but no amount entered
            disabled={!notes || isProcessing || (isPartial && !amount)}
            
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
              ${isReject 
                ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50' 
                : 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/50'
              }`}
          >
            {isProcessing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}