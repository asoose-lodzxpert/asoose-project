import React from 'react';
import { DollarSign, CheckCircle } from 'lucide-react';
import { Currency } from '@/app/main/components/Currency';

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface PayoutsTabProps {
  unpaidBalance: number;
  payouts: Payout[];
  onProcessPayout: () => void;
}

export default function PayoutsTabContent({ unpaidBalance, payouts, onProcessPayout }: PayoutsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 bg-[#0F172A] border border-gray-700 rounded-xl">
        <div>
          <p className="text-gray-400 text-sm font-bold uppercase">Available for Payout</p>
          <h3 className="text-3xl font-black text-white mt-1">${unpaidBalance?.toLocaleString() || '0.00'}</h3>
        </div>
        <button onClick={onProcessPayout} disabled={!unpaidBalance || unpaidBalance <= 0} className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Pay Now
        </button>
      </div>

      <h3 className="text-white font-bold mt-6 mb-4">Payout History</h3>
      {payouts.length > 0 ? (
        <div className="space-y-2">
          {payouts.map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 bg-[#0F172A] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-full text-green-500"><CheckCircle className="w-4 h-4" /></div>
                <div>
                  <p className="text-white font-bold"><Currency amount={p.amount}/></p>
                  <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded uppercase">{p.status}</span>
            </div>
          ))}
        </div>
      ) : <div className="text-gray-400 text-center py-4">No payout history available</div>}
    </div>
  );
}