"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";

const PerformanceChart = () => {
  const data = [
    { month: 'Jan', revenue: 3200 },
    { month: 'Feb', revenue: 4100 },
    { month: 'Mar', revenue: 3800 },
    { month: 'Apr', revenue: 5200 },
    { month: 'May', revenue: 4800 },
    { month: 'Jun', revenue: 5600 },
  ];

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-500" />
        Revenue Performance (6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={192}>
        <BarChart data={data}>
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#111827', 
              border: 'none', 
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px'
            }}
            formatter={(value) => `$${value.toLocaleString()}`}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Bar 
            dataKey="revenue" 
            fill="url(#blueGradient)" 
            radius={[8, 8, 0, 0]}
          />
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;