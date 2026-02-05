import React from "react";
import { User, CheckCircle, Star, Bike } from "lucide-react";

interface RiderStatsProps {
  stats: {
    total: number;
    online: number;
    avgRating: number;
    totalRides: number;
  };
}

export default function RiderStats({ stats }: RiderStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            Total Riders
          </p>
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <User className="w-4 h-4 text-blue-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
          {stats.total}
        </h2>
        <p className="text-gray-500 text-xs mt-3 font-medium">All riders</p>
      </div>

      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            Online
          </p>
          <div className="bg-green-500/10 p-2 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-green-500 mt-1">
          {stats.online}
        </h2>
        <p className="text-green-400 text-xs mt-3 font-medium">Available now</p>
      </div>

      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            Avg Rating
          </p>
          <div className="bg-yellow-500/10 p-2 rounded-lg">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-yellow-500 mt-1">
          {stats.avgRating.toFixed(1)}
        </h2>
        <p className="text-gray-500 text-xs mt-3 font-medium">
          Platform average
        </p>
      </div>

      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            Total Rides
          </p>
          <div className="bg-purple-500/10 p-2 rounded-lg">
            <Bike className="w-4 h-4 text-purple-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
          {stats.totalRides.toLocaleString()}
        </h2>
        <p className="text-gray-500 text-xs mt-3 font-medium">All-time rides</p>
      </div>
    </div>
  );
}
