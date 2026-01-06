import React from 'react';

export default function RevenueBreakdown({ data }: { data: { label: string; val: number; color: string }[] }) {
  return (
    <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
      <h3 className="font-bold text-white mb-6">Revenue Breakdown</h3>
      <div className="space-y-6">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">{item.label}</span>
              <span className="text-white font-bold">{item.val}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}