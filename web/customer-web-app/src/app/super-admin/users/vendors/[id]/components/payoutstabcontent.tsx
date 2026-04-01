"use client";

import React from "react";
import { Banknote, CheckCircle } from "lucide-react"; // ✅ Switched to Banknote for a better NGN context
import { Currency } from "@/app/main/components/Currency";
import { formatDateOnly } from "@/utils/formatDate";

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

export default function PayoutsTabContent({
  unpaidBalance,
  payouts,
  onProcessPayout,
}: PayoutsTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. Available Balance Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-[#0F172A] border border-gray-700 rounded-xl gap-4">
        <div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            Available for Payout
          </p>
          <div className="text-3xl font-bold text-white mt-1">
            {/* ✅ Fixed: Replaced hardcoded $ with Currency component for Naira display */}
            <Currency amount={unpaidBalance || 0} />
          </div>
        </div>

        <button
          onClick={onProcessPayout}
          disabled={!unpaidBalance || unpaidBalance <= 0}
          className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Banknote className="w-4 h-4" /> Settlement Payout
        </button>
      </div>

      {/* 2. Payout History Section */}
      <div>
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          Payout History
        </h3>

        {payouts.length > 0 ? (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-4 bg-[#0F172A] rounded-lg border border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    {/* ✅ Already using Currency component */}
                    <p className="text-white font-bold">
                      <Currency amount={p.amount} />
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {formatDateOnly(p.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded uppercase border border-green-500/20">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-10 bg-[#0F172A]/50 rounded-xl border border-dashed border-gray-800">
            <p className="text-sm">
              No payout history recorded for this vendor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
