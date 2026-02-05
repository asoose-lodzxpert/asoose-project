"use client";

import React from "react";
import useSWR from "swr";
import { fetcher } from "../hooks/useSuperAdminFetch";
import { Check, X, Banknote, Clock } from "lucide-react";
import PayoutsSkeleton from "./skeleton";

interface PayoutResponse {
  vendorPayouts: Array<{
    id: string;
    amount: number;
    store: {
      name: string;
      bankAccount?: any;
    };
  }>;
  riderPayouts: Array<{
    id: string;
    amount: number;
    rider: {
      name: string;
      bankAccount?: any;
    };
  }>;
}

export default function PayoutsManagement() {
  const { data, mutate, isLoading } = useSWR<PayoutResponse>(
    "/super-admin/payouts/pending",
    fetcher,
  );

  // FIX: Moved useMemo ABOVE the conditional return to follow the Rules of Hooks
  const allPayouts = React.useMemo(() => {
    if (!data) return [];
    try {
      return [
        ...(data.vendorPayouts?.map((p) => ({
          ...p,
          type: "VENDOR" as const,
          name: p.store?.name || "Unknown Store",
        })) || []),
        ...(data.riderPayouts?.map((p) => ({
          ...p,
          type: "RIDER" as const,
          name: p.rider?.name || "Unknown Rider",
        })) || []),
      ];
    } catch (e) {
      console.error("Malformed payout data encountered", e);
      return [];
    }
  }, [data]);

  const handleAction = async (
    id: string,
    type: "VENDOR" | "RIDER",
    action: "approve" | "reject",
  ) => {
    const reason = action === "reject" ? prompt("Reason for rejection:") : null;
    if (action === "reject" && !reason) return;

    try {
      // Uses centralized fetcher to ensure Authorization headers are attached
      await fetcher(`/super-admin/payouts/${type}/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      mutate();
    } catch (err: any) {
      alert(err.message || "Action failed");
    }
  };

  // Conditionals must come after all hook declarations
  if (isLoading) return <PayoutsSkeleton />;

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
            <div
              key={payout.id}
              className="bg-[#1E293B] p-5 rounded-xl border border-gray-800 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${payout.type === "VENDOR" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}
                  >
                    {payout.type}
                  </span>
                  <h3 className="font-bold">{payout.name}</h3>
                </div>
                <p className="text-2xl font-black text-white">
                  ₦{payout.amount.toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(payout.id, payout.type, "reject")}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg transition-colors hover:bg-red-500/20"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={() =>
                    handleAction(payout.id, payout.type, "approve")
                  }
                  className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg transition-colors hover:bg-green-700"
                >
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
