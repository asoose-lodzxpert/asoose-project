'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartDataPoint } from './data';
import { Loader2 } from 'lucide-react';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-gray-300 text-xs font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ChartsProps {
  orderVolumeData: ChartDataPoint[];
  growthData: ChartDataPoint[];
}

export default function ChartsSection({ orderVolumeData, growthData }: ChartsProps) {
  // 1. Add state to track if component is mounted in browser
  const [isMounted, setIsMounted] = useState(false);

  // 2. Set mounted to true only after initial client-side render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 3. Helper to render a skeleton if not mounted yet
  const ChartSkeleton = () => (
    <div className="h-[300px] w-full flex items-center justify-center bg-gray-800/20 rounded-lg animate-pulse border border-gray-800 border-dashed">
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-xs">Loading Chart...</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Chart 1: Order Volume */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <h3 className="font-bold text-lg text-white mb-6">Order Volume by Service Type</h3>
        
        {/* 4. Conditionally render: If not mounted, show Skeleton. If mounted, show Chart. */}
        {!isMounted ? (
          <ChartSkeleton />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                <Bar dataKey="food" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Food" />
                <Bar dataKey="grocery" fill="#6B7280" radius={[4, 4, 0, 0]} name="Grocery" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 2: Growth */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <h3 className="font-bold text-lg text-white mb-6">Ride vs. Delivery Growth</h3>
        
        {!isMounted ? (
          <ChartSkeleton />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                <Line type="monotone" dataKey="rides" stroke="#EAB308" strokeWidth={3} dot={{ fill: '#EAB308', r: 4 }} activeDot={{ r: 6 }} name="Rides" />
                <Line type="monotone" dataKey="delivery" stroke="#A855F7" strokeWidth={3} dot={{ fill: '#A855F7', r: 4 }} activeDot={{ r: 6 }} name="Delivery" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}