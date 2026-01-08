import React from 'react';
import { DollarSign } from 'lucide-react';
import { SectionCard } from './SectionCard';
interface WalletBalanceProps {
  before: number;
  after: number;
  amount: number;
  isCredit: boolean;
}

export const WalletBalanceCard = ({ before, after, amount, isCredit }: WalletBalanceProps) => {
  return (
    <SectionCard title="Wallet Balance" icon={DollarSign} iconColorClass="bg-emerald-500/20 text-emerald-500">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Before</span>
          <span className="text-white font-medium">${before.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Transaction</span>
          <span className={`font-bold ${isCredit ? 'text-green-500' : 'text-orange-500'}`}>
            {isCredit ? '+' : '-'}${Math.abs(amount).toFixed(2)}
          </span>
        </div>
        <div className="pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">After</span>
            <span className="text-white font-bold text-lg">${after.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};