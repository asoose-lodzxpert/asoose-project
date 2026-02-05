import React, { useMemo } from "react";
import { DollarSign, CheckCircle, Clock } from "lucide-react";
// import { Rider, Ride, Payout } from '../types';
import { Rider, Ride, Payout } from "./types";
interface StatsProps {
  rider: Rider;
  rides: Ride[];
  payouts: Payout[];
}

export default function StatsOverview({ rider, rides, payouts }: StatsProps) {
  // Calculate stats dynamically from the current data state
  const stats = useMemo(() => {
    // Calculate total earnings from PAID payouts
    const totalEarnings = payouts
      .filter((p) => p.status === "Paid")
      .reduce(
        (sum, p) => sum + parseFloat(p.amount.replace(/[^0-9.-]+/g, "")),
        0,
      );

    // Calculate completion rate
    const completedRides = rides.filter((r) => r.status === "Completed").length;
    const totalRidesCount = rides.length;
    const completionRate =
      totalRidesCount > 0
        ? Math.round((completedRides / totalRidesCount) * 100)
        : 0;

    // Mock total hours (just for demo purposes)
    const totalHours = 450;

    return {
      earnings: `$${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      completion: `${completionRate}%`,
      hours: `${totalHours}h`,
    };
  }, [rides, payouts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <p className="text-gray-400 text-xs font-bold uppercase mb-1">
          Total Earnings
        </p>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-xl md:text-2xl font-black text-white">
            {stats.earnings}
          </span>
        </div>
      </div>
      <div className="bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <p className="text-gray-400 text-xs font-bold uppercase mb-1">
          Completion Rate
        </p>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-xl md:text-2xl font-black text-white">
            {stats.completion}
          </span>
        </div>
      </div>
      <div className="bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <p className="text-gray-400 text-xs font-bold uppercase mb-1">
          Total Hours
        </p>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-xl md:text-2xl font-black text-white">
            {stats.hours}
          </span>
        </div>
      </div>
    </div>
  );
}
