'use client';
import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ModalType } from '../types';
interface Props {
  isOpen: boolean;
  type: ModalType;
  maxRefundAmount: number;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (input: string) => void;
}

export default function ResolutionModal({ isOpen, type, maxRefundAmount, isProcessing, onClose, onConfirm }: Props) {
  const [input, setInput] = useState('');

  if (!isOpen || !type) return null;

  const isRefund = type.includes('REFUND');
  const isPartial = type === 'REFUND_PARTIAL';
  const isValid = isPartial 
    ? (input && parseFloat(input) > 0 && parseFloat(input) <= maxRefundAmount)
    : (isRefund ? true : input.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#1E293B] border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">
          {type === 'REFUND_FULL' && 'Confirm Full Refund'}
          {type === 'REFUND_PARTIAL' && 'Issue Partial Refund'}
          {type === 'REJECT' && 'Reject Dispute'}
          {type === 'RESOLVE_NO_REFUND' && 'Resolve Without Refund'}
        </h3>
        
        <div className="space-y-4">
          {type === 'REFUND_FULL' && (
            <p className="text-gray-300 text-sm">
              Refund full amount of <span className="text-white font-bold">${maxRefundAmount.toFixed(2)}</span>?
            </p>
          )}

          {isPartial && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount ($)</label>
              <input 
                type="number" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-[#0F172A] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                placeholder="0.00"
                autoFocus
              />
              {parseFloat(input) > maxRefundAmount && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Exceeds total ${maxRefundAmount}
                </p>
              )}
            </div>
          )}

          {(!isRefund || type === 'REJECT') && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Note/Reason</label>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-[#0F172A] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-32 resize-none"
                placeholder="Explanation..."
              />
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">Cancel</button>
            <button 
              onClick={() => onConfirm(input)}
              disabled={isProcessing || !isValid}
              className={`flex-1 px-4 py-2 text-white font-bold rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 ${
                type === 'REJECT' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}