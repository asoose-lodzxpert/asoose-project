'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10B981', '#EAB308', '#3B82F6', '#A855F7', '#EC4899'];

interface RevenueItem {
  category: string;
  amount: number;
  percentage: number;
  change: number;
}

export default function RevenueBreakdown({ data }: { data: RevenueItem[] }) {
  // 1. Reusable Naira Formatters
  const nairaFormatter = useMemo(() => new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }), []);

  const compactNairaFormatter = useMemo(() => new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1,
  }), []);

  // 2. Safe empty state check
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800 h-[400px] flex items-center justify-center text-gray-500">
        No revenue data available
      </div>
    );
  }

  // 3. Process data using raw numbers only
  const chartData = data.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage
  }));

  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800 flex flex-col">
      <h3 className="font-bold text-white mb-2">Revenue Source</h3>
      <p className="text-gray-400 text-xs mb-6">Breakdown by service type</p>

      <div className="flex-1 min-h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
              ))}
            </Pie>

<Tooltip 
  contentStyle={{ 
    backgroundColor: '#0F172A', 
    borderColor: '#334155', 
    borderRadius: '8px' 
  }}
  itemStyle={{ color: '#fff', fontSize: '12px' }}
  // FIX: Explicitly handle number | undefined to satisfy Recharts types
  formatter={(value: number | undefined) => [
    nairaFormatter.format(value ?? 0), 
    'Revenue'
  ]}
/>
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-gray-300 text-xs ml-1">
                  {value} ({Math.round(entry.payload.percentage)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Label: Fixed formatting and currency */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Total</p>
          <p className="text-white font-bold text-sm">
            {compactNairaFormatter.format(totalRevenue)}
          </p>
        </div>
      </div>
    </div>
  );
}