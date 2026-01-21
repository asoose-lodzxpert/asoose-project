'use client';

import React from 'react';
import useSWR from 'swr';
import { fetcher } from '../hooks/useSuperAdminFetch';
import { Check, X, Banknote, Clock } from 'lucide-react';
import PayoutsSkeleton from './skeleton';

// 1. Define the specific structures returned by the backend
interface PayoutResponse {
  vendorPayouts: Array<{
    id: string;
    amount: number;
    storeId: string;
    store: {
      name: string;
      bankAccount?: any;
    };
  }>;
  riderPayouts: Array<{
    id: string;
    amount: number;
    riderProfileId: string;
    riderProfile: {
      user: {
        name: string;
      };
      bankAccount?: any;
    };
  }>;
}

export default function PayoutsManagement() {
  // 2. Pass the interface to useSWR to fix the "type {}" errors
  const { data, mutate, isLoading } = useSWR<PayoutResponse>(
    '/super-admin/payouts/pending', 
    fetcher
  );

  const handleAction = async (id: string, type: 'VENDOR' | 'RIDER', action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Reason for rejection:') : null;
    if (action === 'reject' && !reason) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/super-admin/payouts/${type}/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) mutate();
    } catch (err) {
      alert('Action failed');
    }
  };

  if (isLoading) return <PayoutsSkeleton/>;

  // Now 'data' is typed, so these property accesses are valid
  const allPayouts = [
    ...(data?.vendorPayouts?.map((p) => ({ ...p, type: 'VENDOR' as const, name: p.store.name })) || []),
    ...(data?.riderPayouts?.map((p) => ({ ...p, type: 'RIDER' as const, name: p.riderProfile.user.name })) || []),
  ];

  return (
    <div className="p-6 bg-[#0F172A] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Banknote className="text-yellow-500" /> Payout Approvals
      </h1>

      <div className="grid gap-4">
        {allPayouts.length === 0 ? (
          <div className="bg-[#1E293B] p-10 rounded-xl text-center border border-dashed border-gray-700">
            <Clock className="mx-auto mb-2 text-gray-500" />
            <p className="text-gray-400">No pending payout requests</p>
          </div>
        ) : (
          allPayouts.map((payout) => (
            <div key={payout.id} className="bg-[#1E293B] p-5 rounded-xl border border-gray-800 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${payout.type === 'VENDOR' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {payout.type}
                  </span>
                  <h3 className="font-bold">{payout.name}</h3>
                </div>
                <p className="text-2xl font-black text-white">₦{payout.amount.toLocaleString()}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleAction(payout.id, payout.type, 'reject')} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                  <X size={20} />
                </button>
                <button onClick={() => handleAction(payout.id, payout.type, 'approve')} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg">
                  <Check size={18} /> Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}