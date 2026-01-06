import React from 'react';
import { ArrowUpRight, DollarSign, ShoppingBag, Users, UserPlus } from 'lucide-react';
import { OverviewMetric } from './data';
const iconMap = {
  DollarSign, ShoppingBag, Users, UserPlus
};

export default function OverviewCards({ metrics }: { metrics: OverviewMetric[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((stat, i) => {
        const Icon = iconMap[stat.iconName];
        return (
          <div key={i} className="bg-[#1E293B] p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> {stat.change}
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white">{stat.value}</h3>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              <p className="text-gray-600 text-xs mt-2">vs last period</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}