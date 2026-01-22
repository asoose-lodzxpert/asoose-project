import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, Users, Activity, Minus } from 'lucide-react';

// Define the shape of a single metric
export interface OverviewMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon?: any; // Optional icon override
}

// ✅ FIX: Update interface to accept 'subtext' and allow 'metrics' to be null
interface OverviewCardsProps {
  metrics: OverviewMetric[] | null; 
  subtext?: string; 
}

const getIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('revenue') || l.includes('sales')) return DollarSign;
  if (l.includes('order')) return ShoppingBag;
  if (l.includes('user') || l.includes('customer')) return Users;
  return Activity;
};

export default function OverviewCards({ metrics, subtext }: OverviewCardsProps) {
  // Handle loading/null state gracefully
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#1E293B] h-32 rounded-xl animate-pulse border border-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon || getIcon(metric.label);
        const isPositive = metric.trend === 'up';
        const isNeutral = metric.trend === 'neutral';

        return (
          <div 
            key={index} 
            className="bg-[#1E293B] border border-gray-800 p-5 rounded-xl hover:border-gray-700 transition-colors shadow-sm group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400 group-hover:text-white group-hover:bg-gray-700 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              
              {/* Change Indicator */}
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                isNeutral ? 'bg-gray-800 text-gray-400' :
                isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{Math.abs(metric.change)}%</span>
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">{metric.label}</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{metric.value}</h3>
              
              {/* ✅ FIX: Display the subtext here */}
              {subtext && (
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  {subtext}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}