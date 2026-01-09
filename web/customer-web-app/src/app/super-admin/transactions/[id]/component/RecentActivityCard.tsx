import React from 'react';
import { TrendingUp } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
export const RecentActivityCard = ({ activity }: { activity: NonNullable<TransactionDetail['recentActivity']> }) => {
  return (
    <SectionCard title="Recent Activity" icon={TrendingUp} iconColorClass="bg-cyan-500/20 text-cyan-500">
      <p className="text-gray-400 text-sm mb-6">{activity.period}</p>
      
      <div className="space-y-4">
        {/* Vendor Stats */}
        {activity.totalOrders !== undefined && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0F172A] p-3 rounded-lg">
              <p className="text-gray-400 text-xs mb-1">Total Orders</p>
              <p className="text-white font-bold text-xl">{activity.totalOrders}</p>
            </div>
            {activity.averageOrderValue !== undefined && (
              <div className="bg-[#0F172A] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Avg Order</p>
                <p className="text-white font-bold text-xl">
                  ${activity.averageOrderValue.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Revenue/Earnings Highlight */}
        {(activity.totalRevenue !== undefined || activity.totalEarnings !== undefined) && (
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20">
            <p className="text-gray-400 text-xs mb-1">
              {activity.totalRevenue !== undefined ? 'Revenue' : 'Earnings'}
            </p>
            <p className="text-green-500 font-bold text-2xl">
              ${(activity.totalRevenue || activity.totalEarnings || 0).toFixed(2)}
            </p>
          </div>
        )}
        
        {/* Add other stats (distance, trips etc) following the same pattern if needed */}
        {activity.totalDistance && (
          <div className="bg-[#0F172A] p-4 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">Distance Covered</p>
            <p className="text-white font-bold text-xl">{activity.totalDistance}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};