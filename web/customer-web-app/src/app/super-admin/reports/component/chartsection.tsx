'use client';

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Loader2, Info } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0F172A] border border-gray-700 rounded-lg p-3 shadow-xl z-50">
        <p className="text-gray-300 text-xs font-bold mb-2 border-b border-gray-800 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs mb-1">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-mono font-bold text-white">
              {entry.name === 'Revenue' ? '$' : ''}{entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface ChartsProps {
  volumeData: any[];
  growthData: any[];
  granularity: string;
}

export default function ChartsSection({ volumeData, growthData, granularity }: ChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Chart 1: Order Volume */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-lg text-white">Order Volume & Revenue</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Info className="w-3 h-3" /> Grouped by <span className="text-yellow-500 font-bold">{granularity}</span>
            </p>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} onClick={(data) => console.log("Drill down to date:", data?.activeLabel)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis yAxisId="left" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              
              <Bar yAxisId="left" dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Orders" barSize={granularity === 'Day' ? 20 : 40} />
              <Bar yAxisId="right" dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Revenue" barSize={granularity === 'Day' ? 20 : 40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Growth */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <h3 className="font-bold text-lg text-white mb-6">Platform Growth</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              
              <Line type="monotone" dataKey="rides" stroke="#EAB308" strokeWidth={3} dot={{ fill: '#EAB308', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="New Riders" />
              <Line type="monotone" dataKey="delivery" stroke="#A855F7" strokeWidth={3} dot={{ fill: '#A855F7', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="New Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}