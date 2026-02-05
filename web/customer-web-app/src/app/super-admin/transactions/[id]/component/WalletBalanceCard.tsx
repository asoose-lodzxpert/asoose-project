import React from "react";
import { Banknote } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Currency } from "@/app/main/components/Currency"; // ✅ Added

interface WalletBalanceProps {
  before: number;
  after: number;
  amount: number;
  isCredit: boolean;
}

export const WalletBalanceCard = ({
  before,
  after,
  amount,
  isCredit,
}: WalletBalanceProps) => {
  return (
    <SectionCard
      title="Wallet Balance"
      icon={Banknote}
      iconColorClass="bg-emerald-500/20 text-emerald-500"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Before</span>
          {/* ✅ Fixed: Formatted before balance */}
          <span className="text-white font-medium">
            <Currency amount={before} />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Transaction</span>
          <span
            className={`font-bold flex items-center gap-1 ${isCredit ? "text-green-500" : "text-orange-500"}`}
          >
            {/* ✅ Fixed: Formatted transaction amount */}
            <span>{isCredit ? "+" : "-"}</span>
            <Currency amount={Math.abs(amount)} />
          </span>
        </div>
        <div className="pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">After</span>
            {/* ✅ Fixed: Formatted after balance */}
            <span className="text-white font-bold text-lg">
              <Currency amount={after} />
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
