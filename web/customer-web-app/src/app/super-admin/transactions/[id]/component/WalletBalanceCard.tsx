import React from "react";
import { Banknote, AlertTriangle } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Currency } from "@/app/main/components/Currency";
import { validateWalletBalances, formatBalanceChange } from "@/utils/balance-validation";

interface WalletBalanceProps {
  before: number;
  after: number;
  amount: number;
  isCredit: boolean;
  transactionType?: string;
}

export const WalletBalanceCard = ({
  before,
  after,
  amount,
  isCredit,
  transactionType = 'ADJUSTMENT',
}: WalletBalanceProps) => {
  // ✅ CRITICAL FIX: Validate balance calculations
  const validation = validateWalletBalances(
    before,
    after,
    isCredit ? Math.abs(amount) : -Math.abs(amount),
    transactionType
  );

  // ✅ Log validation errors for debugging
  if (!validation.valid) {
    console.error('🚨 WALLET BALANCE VALIDATION ERROR:', {
      before,
      after,
      amount,
      isCredit,
      transactionType,
      error: validation.error,
      expectedAfter: validation.expectedAfter,
    });
  }

  return (
    <SectionCard
      title="Wallet Balance"
      icon={Banknote}
      iconColorClass="bg-emerald-500/20 text-emerald-500"
    >
      {/* ✅ CRITICAL FIX: Display validation error if balance calculation is wrong */}
      {!validation.valid && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-500 text-xs font-bold">BALANCE CALCULATION ERROR</p>
            <p className="text-red-400 text-xs mt-1">{validation.error}</p>
            {validation.expectedAfter !== undefined && (
              <p className="text-red-300 text-xs mt-2">
                Expected After: <Currency amount={validation.expectedAfter} />
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Before</span>
          <span className="text-white font-medium">
            <Currency amount={before} />
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Transaction</span>
          <span
            className={`font-bold flex items-center gap-1 ${isCredit ? "text-green-500" : "text-orange-500"}`}
          >
            <span>{isCredit ? "+" : "-"}</span>
            <Currency amount={Math.abs(amount)} />
          </span>
        </div>

        <div className="pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">After</span>
            <span className={`font-bold text-lg ${validation.valid ? "text-white" : "text-red-500"}`}>
              <Currency amount={after} />
            </span>
          </div>

          {/* ✅ ADDED: Show calculated difference for verification */}
          <p className={`text-xs mt-2 ${validation.valid ? "text-gray-400" : "text-red-400"}`}>
            Difference: {formatBalanceChange(before, after)}
          </p>

          {/* ✅ ADDED: Show if balances are hardcoded (audit risk) */}
          {before === 0 && after === 0 && Math.abs(amount) > 0.01 && (
            <p className="text-xs text-yellow-500 mt-2">
              ⚠️ Warning: Balance tracking may be disabled for this transaction type
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
