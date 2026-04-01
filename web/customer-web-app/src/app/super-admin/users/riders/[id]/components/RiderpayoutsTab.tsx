"use client";

import React from "react";
import {
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { AppAlert } from "../../../customers/[id]/alerts";
import { Currency } from "@/app/main/components/Currency";
import { formatDateOnly, formatTimeOnly } from "@/utils/formatDate";
interface Payout {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  processedAt?: string;
  reference?: string;
}

export const RiderPayoutsTab = ({
  payouts,
  onProcess,
}: {
  payouts: Payout[];
  onProcess: (id: string, status: string) => void;
}) => {
  const handleMarkPaid = async (payout: Payout) => {
    const res = await AppAlert.confirm(
      "Mark as Paid?",
      `Confirm transfer of ₦${payout.amount}?`,
      "Confirm Payment",
    );
    if (res.isConfirmed) onProcess(payout.id, "PAID");
  };

  const handleReject = async (payout: Payout) => {
    const res = await AppAlert.confirm(
      "Reject Payout?",
      "Funds will be returned to rider wallet.",
      "Reject",
      true,
    );
    if (res.isConfirmed) onProcess(payout.id, "FAILED");
  };

  if (!payouts.length)
    return (
      <div className="p-10 text-center text-gray-500">
        No payout history found.
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-400">
        <thead className="bg-[#0F172A] text-gray-200 font-bold uppercase text-xs border-b border-gray-800">
          <tr>
            <th className="p-4">Date</th>
            <th className="p-4">Amount</th>
            <th className="p-4">Reference</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {payouts.map((payout) => (
            <tr
              key={payout.id}
              className="hover:bg-[#0F172A]/50 transition-colors"
            >
              <td className="p-4">
                <div className="text-white font-bold">
                  {formatDateOnly(payout.createdAt)}
                </div>
                <div className="text-xs">
                  {formatTimeOnly(payout.createdAt)}
                </div>
              </td>
              <td className="p-4 font-mono text-white">
                <Currency amount={payout.amount} />
              </td>
              <td className="p-4 font-mono text-xs">
                {payout.reference || "-"}
              </td>
              <td className="p-4">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold border ${
                    payout.status === "PAID"
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : payout.status === "FAILED"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                  }`}
                >
                  {payout.status}
                </span>
              </td>
              <td className="p-4 text-right">
                {payout.status === "PENDING" ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleMarkPaid(payout)}
                      className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500 hover:text-white"
                      title="Mark Paid"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(payout)}
                      className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-600">Completed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
