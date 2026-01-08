import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface HealthScoreCardProps {
  totalOrders: number;
}

export default function HealthScoreCard({ totalOrders }: HealthScoreCardProps) {
  // Logic remains here, isolated from the main page
  const healthScore = totalOrders ? 95 : 100;
  const healthColor = healthScore >= 90 ? '#22c55e' : healthScore >= 70 ? '#eab308' : '#ef4444';

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-bold text-sm uppercase">Health Score</h3>
        <div className={`text-xs font-bold px-2 py-1 rounded ${healthScore >= 90 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {healthScore >= 90 ? 'EXCELLENT' : 'RISKY'}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[{ value: healthScore }, { value: 100 - healthScore }]} innerRadius={28} outerRadius={36} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                <Cell fill={healthColor} />
                <Cell fill="#334155" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">{healthScore}%</div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Reliability Rate</p>
          <p className="text-white text-sm font-bold">{totalOrders} Orders</p>
        </div>
      </div>
    </div>
  );
}