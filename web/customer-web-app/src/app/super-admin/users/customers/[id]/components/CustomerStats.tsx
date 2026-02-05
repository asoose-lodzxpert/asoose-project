import React from "react";
import { CustomerStats as IStats } from "../types";
import { Currency } from "@/app/main/components/Currency";
export const CustomerStats: React.FC<{ stats: IStats }> = ({ stats }) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800">
        <p className="text-gray-500 text-[10px] font-bold uppercase">
          Total Spent
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl md:text-2xl font-black text-green-400">
            {formatCurrency(stats.totalSpent || 0)}
          </span>
        </div>
      </div>
      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800">
        <p className="text-gray-500 text-[10px] font-bold uppercase">
          Total Orders
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl md:text-2xl font-black text-white">
            <Currency amount={stats.totalSpent} />
          </span>
        </div>
      </div>
      <div className="col-span-2 md:col-span-1 bg-[#1E293B] p-4 rounded-xl border border-gray-800">
        <p className="text-gray-500 text-[10px] font-bold uppercase">
          Total Rides
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl md:text-2xl font-black text-blue-400">
            {stats.totalRides}
          </span>
        </div>
      </div>
    </div>
  );
};
