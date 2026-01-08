"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

interface PerformanceData {
  date: string;
  revenue: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
}

const PerformanceChart = ({ data }: PerformanceChartProps) => {
  // Debug: Check what data is actually arriving
  console.log("Chart Data:", data);

  const hasData = data && data.length > 0;
  const hasRevenue = hasData && data.some(d => d.revenue > 0);

  // If no data object exists, show loading/empty state
  if (!hasData) {
    return (
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 h-[280px] flex flex-col items-center justify-center text-gray-500 gap-2">
        <BarChart3 className="w-8 h-8 opacity-50" />
        <p className="text-sm font-medium">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Revenue (Last 30 Days)
        </h3>
        {!hasRevenue && (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
            No sales in this period
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={192}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            minTickGap={30} // ✅ Prevents labels from overlapping
            tickFormatter={(str) => {
              // ✅ SAFER: Parse string directly to avoid timezone shifts
              // Expected format: "2025-12-28"
              if (!str) return "";
              const parts = str.split('-'); 
              if (parts.length === 3) {
                 return `${parts[2]}/${parts[1]}`; // Returns "28/12"
              }
              return str;
            }}
          />
          
          <YAxis hide />
          
          <Tooltip 
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            contentStyle={{ 
              backgroundColor: '#111827', 
              border: '1px solid #374151', 
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px'
            }}
            labelFormatter={(label) => {
               // Format tooltip date nicely
               if (!label) return "";
               const date = new Date(label);
               return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }}
            formatter={(value: number | undefined) => [
              `$${(value ?? 0).toLocaleString()}`, 
              'Revenue'
            ]}
          />
          
          <Bar 
            dataKey="revenue" 
            fill="url(#blueGradient)" 
            radius={[4, 4, 0, 0]}
            // ✅ Optional: If you want to see bars even when 0 (for testing), uncomment below:
            // minPointSize={2} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;