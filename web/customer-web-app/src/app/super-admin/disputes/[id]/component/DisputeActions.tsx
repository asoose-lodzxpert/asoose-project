'use client';
import React from 'react';
import { RotateCcw, CheckCircle, Ban } from 'lucide-react';
import { ModalType } from '../types';

interface Props {
  priority: string;
  canResolve: boolean;
  status: string;
  totalAmount: number;
  onUpdatePriority: (p: string) => void;
  onOpenModal: (type: ModalType) => void;
}

export default function DisputeActions({ priority, canResolve, status, totalAmount, onUpdatePriority, onOpenModal }: Props) {
  if (!canResolve || status !== 'OPEN') return null;

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-4">Actions</h2>
      
      <div className="mb-6">
        <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Priority Level</label>
        <select 
          value={priority}
          onChange={(e) => onUpdatePriority(e.target.value)}
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => onOpenModal('REFUND_FULL')}
          className="w-full py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Refund Full ({totalAmount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })})
        </button>
        
        <button 
          onClick={() => onOpenModal('REFUND_PARTIAL')}
          className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          {/* Replaced DollarSign icon with Naira symbol */}
          <span className="w-4 h-4 flex items-center justify-center font-bold text-base leading-none">₦</span> 
          Partial Refund
        </button>
        
        <button 
          onClick={() => onOpenModal('RESOLVE_NO_REFUND')}
          className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <CheckCircle className="w-4 h-4" /> Resolve (No Refund)
        </button>
        
        <button 
          onClick={() => onOpenModal('REJECT')}
          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mt-4"
        >
          <Ban className="w-4 h-4" /> Reject Dispute
        </button>
      </div>
    </div>
  );
}