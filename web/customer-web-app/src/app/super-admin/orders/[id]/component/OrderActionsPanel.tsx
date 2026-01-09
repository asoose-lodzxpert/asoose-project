'use client';

import React from 'react';
import { AlertTriangle, XCircle, CheckCircle, RefreshCcw } from 'lucide-react';
import Swal from 'sweetalert2';

interface OrderActionsPanelProps {
  orderId: string;
  currentStatus: string;
  onUpdate: () => void; // Function to refresh page data
}

export default function OrderActionsPanel({ orderId, currentStatus, onUpdate }: OrderActionsPanelProps) {

  const handleOverride = async (newStatus: string) => {
    // 1. Force the Admin to give a reason
    const { value: reason } = await Swal.fire({
      title: '⚠️ Force Status Change',
      text: `Are you sure you want to force this order to ${newStatus}? This overrides all system checks.`,
      input: 'text',
      inputPlaceholder: 'Required: Why are you doing this?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: `Yes, Force ${newStatus}`,
      background: '#1E293B', color: '#fff',
      inputValidator: (value) => !value && 'You must provide a reason for the audit log!'
    });

    if (reason) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const session = await import('../../../../../../utils/supabase/client').then(m => m.createClient().auth.getSession());

        const res = await fetch(`${API_URL}/super-admin/orders/${orderId}/override`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`
          },
          body: JSON.stringify({ status: newStatus, reason })
        });

        if (!res.ok) throw new Error('Failed');

        Swal.fire({ 
            title: 'Updated', icon: 'success', timer: 1500, showConfirmButton: false, 
            background: '#1E293B', color: '#fff' 
        });
        
        onUpdate(); // Refresh the parent page

      } catch (e) {
        Swal.fire({ title: 'Error', text: 'Action failed', icon: 'error' });
      }
    }
  };

  return (
    <div className="bg-[#1E293B] border border-red-500/30 rounded-xl p-5 mt-6">
      <div className="flex items-center gap-2 mb-4 text-red-400">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-bold">Operational Overrides (Danger Zone)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Force Cancel */}
        {currentStatus !== 'CANCELLED' && (
          <button 
            onClick={() => handleOverride('CANCELLED')}
            className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-all"
          >
            <XCircle className="w-4 h-4" /> Force Cancel Order
          </button>
        )}

        {/* Force Complete (e.g. Driver forgot to swipe) */}
        {currentStatus !== 'DELIVERED' && (
          <button 
             onClick={() => handleOverride('DELIVERED')}
             className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white rounded-lg font-bold transition-all"
          >
            <CheckCircle className="w-4 h-4" /> Force Mark Delivered
          </button>
        )}

        {/* Reset to Pending (If it got stuck in processing) */}
        <button 
           onClick={() => handleOverride('PENDING')}
           className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg font-bold transition-all"
        >
          <RefreshCcw className="w-4 h-4" /> Reset to Pending
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        * All actions are recorded in the system audit log.
      </p>
    </div>
  );
}